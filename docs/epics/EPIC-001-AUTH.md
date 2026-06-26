# EPIC-001 — Authentication & Identity

## Goal

A student can register with a verified university email, confirm their address, and log in. No feature of the platform is accessible to unverified users.

## Business Rules

1. Only email addresses from registered university domains may register.
2. A user account is created in an **unverified** state; they cannot interact with any feature until email is confirmed.
3. Verification tokens expire after **24 hours**. A new one can be requested after expiry.
4. Passwords must be at least 8 characters, contain at least one uppercase letter, one number, and one special character.
5. A registered but unverified account that has not verified within 7 days is soft-deleted (purge job, Phase 2).
6. A user may belong to only one university (derived from their email domain).
7. Refresh tokens are single-use (rotation on every refresh).
8. Access tokens expire in **15 minutes**; refresh tokens in **7 days**.
9. On logout, the refresh token is invalidated.

## Out of Scope (Iteration 1)

- Social / OAuth login
- Multi-factor authentication
- University SSO / SAML
- Password-based account recovery (stub only — "contact support" message)

---

## Data Model

### `University`
```
id            UUID PK
name          TEXT NOT NULL
email_domain  TEXT NOT NULL UNIQUE   -- e.g. "tu-ilmenau.de"
country       TEXT NOT NULL
active        BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

### `User`  *(Identity v2 additions marked ⬩ — migration pending)*
```
id                     UUID PK
email                  TEXT NOT NULL UNIQUE
password_hash          TEXT NOT NULL
first_name             TEXT NOT NULL
last_name              TEXT NOT NULL
university_id          UUID FK → University  ⬩ NOW NULLABLE (null for non-students & pending "Other")
email_verified         BOOLEAN DEFAULT false
email_verified_at      TIMESTAMPTZ
account_type        ⬩ ENUM('student','non_student') NOT NULL DEFAULT 'student'
student_status      ⬩ ENUM('none','pending','verified','rejected') NOT NULL DEFAULT 'none'
is_verified_student ⬩ BOOLEAN DEFAULT false   -- derived gate (account_type=student & student_status=verified & email_verified)
claimed_university_name ⬩ TEXT                 -- free text from the "Other (Not listed)" path
role                   ENUM('student', 'admin') DEFAULT 'student'
deleted_at             TIMESTAMPTZ          -- soft delete
created_at             TIMESTAMPTZ
updated_at             TIMESTAMPTZ
```

### `StudentVerificationRequest`  ⬩ *(new — feeds the future CMS approval queue)*
```
id                   UUID PK
user_id              UUID FK → User
claimed_university_name  TEXT NOT NULL
email_domain         TEXT NOT NULL
status               ENUM('pending','approved','rejected') DEFAULT 'pending'
reviewed_by          UUID                  -- admin/CMS user (later)
reviewed_at          TIMESTAMPTZ
decision_note        TEXT
created_at           TIMESTAMPTZ
```

### `EmailVerificationToken`
```
id          UUID PK
user_id     UUID FK → User
token_hash  TEXT NOT NULL               -- bcrypt hash of the raw token
expires_at  TIMESTAMPTZ NOT NULL
used_at     TIMESTAMPTZ                 -- null = unused
created_at  TIMESTAMPTZ
```

### `RefreshToken`
```
id          UUID PK
user_id     UUID FK → User
token_hash  TEXT NOT NULL
expires_at  TIMESTAMPTZ NOT NULL
revoked_at  TIMESTAMPTZ
created_at  TIMESTAMPTZ
```

---

## Value Objects

| VO | Status | Notes |
|----|--------|-------|
| `Email` | **Implemented** | Validates format; extracts domain; checks against university whitelist |
| `UniversityDomain` | **Implemented** | Wraps domain string; used in `Email` construction |
| `Password` (plain) | **Not a VO** | Plain string; validated via Zod schema at presentation layer |

---

## Use Cases & Specs

### UC-1.1 `RegisterUser`  *(REVISED for Identity v2 — see ARCHITECTURE "Identity & Account Model")*

> **Behaviour change:** v1 rejected any non-partner email domain (`UNIVERSITY_NOT_SUPPORTED`).
> v2 **never rejects on domain** — non-students and "Other" students are valid accounts.
> Posting is gated later by `isVerifiedStudent`, not at registration.

**Input:** `{ email, password, firstName, lastName, accountType, universityId?, claimedUniversityName? }`
- `accountType`: `'student' | 'non_student'` (required)
- `universityId`: set when a student picks a partner university from the dropdown
- `claimedUniversityName`: free text, required when a student picks **"Other (Not listed)"**

**Flow:**
1. Validate `email` format; validate password strength (`WEAK_PASSWORD`).
2. Check no existing non-deleted user with that email → `EMAIL_ALREADY_REGISTERED`.
3. Hash password (bcrypt, cost 12).
4. Branch by `accountType`:
   - **non_student** → create user `accountType=non_student`, `studentStatus=none`, `universityId=null`, `isVerifiedStudent=false`.
   - **student + partner `universityId`** → load that university. Compare email domain to `university.emailDomain`:
     - match → `studentStatus=pending` now; becomes `verified` automatically **on email verification** (UC-1.2). Link `universityId`.
     - mismatch → `studentStatus=pending`, create a `StudentVerificationRequest` for manual review. (Decision: accept + review rather than hard-reject. Revisit.)
   - **student + "Other"** → require `claimedUniversityName` (`UNIVERSITY_NAME_REQUIRED` if missing). Create user `accountType=student`, `studentStatus=pending`, `universityId=null`; create a `StudentVerificationRequest{ userId, claimedUniversityName, emailDomain }`.
5. Create `User` (`emailVerified=false`).
6. Generate 32-byte token; store SHA-256 hash in `EmailVerificationToken` (24h TTL).
7. Send verification email (fire-and-forget).
8. Return `{ userId, accountType, studentStatus, message }`.

**Error codes:** `INVALID_EMAIL_FORMAT`, `EMAIL_ALREADY_REGISTERED`, `WEAK_PASSWORD`, `INVALID_ACCOUNT_TYPE`, `UNIVERSITY_NAME_REQUIRED`.
*(Removed: `UNIVERSITY_NOT_SUPPORTED` — no longer a registration error.)*

**Spec file:** `apps/api/src/application/auth/register-user.use-case.spec.ts` *(to be revised + expanded)*

---

### UC-1.7 `ListPartnerUniversities` *(new)*

**Input:** none. **Flow:** return `universities` where `active = true`, fields `{ id, name }`, alphabetical.
**Endpoint:** `GET /auth/universities` (public — needed to populate the signup dropdown).
**Spec file:** `apps/api/src/application/auth/list-universities.use-case.spec.ts`

---

### UC-1.8 `AuthorizeStudentPosting` (guard) *(new)*

Not a use case but a cross-cutting **`VerifiedStudentGuard`**: rejects create/post actions with `403 STUDENT_VERIFICATION_REQUIRED` unless `isVerifiedStudent === true`. Applied to marketplace + housing create endpoints. Requires `isVerifiedStudent` on the JWT payload and `/auth/me`.
**Spec file:** `apps/api/src/presentation/auth/guards/verified-student.guard.spec.ts`

> **Email-domain detection** (matching email domain → partner university for the automated verified path) is the *"sort student vs non-student / partner emails"* work the product owner flagged as not-yet-done. It lives in UC-1.1 step 4 + UC-1.2 promotion.

---

### UC-1.2 `VerifyEmail`

**Input:** `{ token: string }`

**Flow:**
1. Find token record where `used_at IS NULL AND expires_at > NOW()`.
2. Compare raw token to `token_hash` (bcrypt compare).
3. If invalid or expired → throw `INVALID_OR_EXPIRED_TOKEN`.
4. Mark `used_at = NOW()` on token.
5. Mark `user.email_verified = true`, `user.email_verified_at = NOW()`.
6. **(Identity v2)** If the user is a `student` with `studentStatus=pending` **and** a linked partner `universityId` whose `emailDomain` matches the verified email → promote to `studentStatus=verified` (`isVerifiedStudent` becomes true). "Other"/mismatch students stay `pending` (await CMS approval).
7. Return `{ message: "Email verified successfully" }`.

**Error codes:**
- `INVALID_OR_EXPIRED_TOKEN`

**Edge cases:**
- Token already used → `INVALID_OR_EXPIRED_TOKEN` (do not reveal it was used)
- User already verified → still mark token used, return success (idempotent)

**Spec file:** `apps/api/src/application/auth/verify-email.use-case.spec.ts`

---

### UC-1.3 `ResendVerificationEmail`

**Input:** `{ email: string }`

**Flow:**
1. Find user by email. If not found → return success anyway (don't reveal user existence).
2. If already verified → return success (no email sent).
3. Invalidate existing unused tokens for user (set `used_at = NOW()`).
4. Generate new token, store hash, send email.
5. Return `{ message: "If your email is registered and unverified, a new link was sent" }`.

**Rate limit:** Max 3 resend requests per hour per email address.

**Spec file:** `apps/api/src/application/auth/resend-verification.use-case.spec.ts`

---

### UC-1.4 `Login`

**Input:** `{ email, password }`

**Flow:**
1. Find user by email (not soft-deleted).
2. If not found → throw `INVALID_CREDENTIALS` (timing-safe — always run bcrypt compare).
3. Compare password hash. If mismatch → throw `INVALID_CREDENTIALS`.
4. If `email_verified = false` → throw `EMAIL_NOT_VERIFIED`.
5. Generate access JWT (15m, payload: `{ sub: userId, role }`).
6. Generate refresh token (random 32 bytes); store hash in `RefreshToken` (7d expiry).
7. Return `{ accessToken }`. Set refresh token in httpOnly, Secure, SameSite=Strict cookie.

**Error codes:**
- `INVALID_CREDENTIALS`
- `EMAIL_NOT_VERIFIED`

**Spec file:** `apps/api/src/application/auth/login.use-case.spec.ts`

---

### UC-1.5 `RefreshAccessToken`

**Input:** refresh token from cookie

**Flow:**
1. Find `RefreshToken` record by token hash.
2. Validate: not revoked, not expired.
3. Revoke the old token (`revoked_at = NOW()`).
4. Issue new access token + new refresh token (rotation).
5. Return new access token; set new refresh cookie.

**Error codes:**
- `INVALID_REFRESH_TOKEN`
- `REFRESH_TOKEN_EXPIRED`

**Spec file:** `apps/api/src/application/auth/refresh-token.use-case.spec.ts`

---

### UC-1.6 `Logout`

**Input:** refresh token from cookie

**Flow:**
1. Find and revoke the refresh token (`revoked_at = NOW()`).
2. Clear the cookie.
3. Return 200 (even if token not found — idempotent).

**Spec file:** `apps/api/src/application/auth/logout.use-case.spec.ts`

---

## API Endpoints

| Method | Path | Auth | Use Case |
|--------|------|------|---------|
| POST | `/auth/register` | None | UC-1.1 |
| GET | `/auth/verify-email` | None | UC-1.2 |
| POST | `/auth/resend-verification` | None | UC-1.3 |
| POST | `/auth/login` | None | UC-1.4 |
| POST | `/auth/refresh` | Cookie | UC-1.5 |
| POST | `/auth/logout` | Cookie | UC-1.6 |
| GET | `/auth/me` | Bearer | Profile — ⬩ now incl. `accountType`, `studentStatus`, `isVerifiedStudent`, `university` |
| GET | `/auth/universities` ⬩ | None | UC-1.7 — partner list for signup dropdown |

---

## Frontend Flows

> ⚠️ This section describes the original Next.js web pages, which were **dropped** (the app is mobile-only). The live flows are in the Expo app; the **Identity v2 signup redesign** is specified in `docs/mobile/UI_BRIEF-account-types-and-signup.md`. Kept below for historical reference.

### Registration Page (`/register`)
- Fields: First Name, Last Name, Email, Password, Confirm Password
- Client-side: password strength indicator, email domain hint ("Use your university email")
- On submit: `POST /auth/register`
- Success → redirect to `/register/check-email` (informational page)
- Error → inline field errors

### Email Verification Landing (`/verify-email`)
- Reads `?token=` from URL
- Calls `GET /auth/verify-email?token=...`
- Success → redirect to `/login?verified=true`
- Error → show "Link expired" with "Resend verification email" form

### Login Page (`/login`)
- Fields: Email, Password
- `POST /auth/login`
- Success → redirect to `/dashboard`
- `EMAIL_NOT_VERIFIED` → show banner with "Resend verification" link

---

## Acceptance Criteria — Identity v2 *(planned, not yet built)*

- [ ] Signup asks "Are you a student?"; non-students can create an account and browse, but never see a working post action
- [ ] Students choose a partner university from a list, or **"Other (Not listed)"** with a free-text university name
- [x] Registration no longer rejects on email domain (no `UNIVERSITY_NOT_SUPPORTED`) — *2026-06-26*
- [x] Partner student whose email domain matches → becomes `verified` automatically on email verification — *2026-06-26*
- [x] "Other"/mismatch student → `pending`, a `StudentVerificationRequest` row is created, and they cannot post — *2026-06-26*
- [x] `POST /marketplace/listings` returns `403 STUDENT_VERIFICATION_REQUIRED` unless `isVerifiedStudent` — *2026-06-26* *(housing create: when Housing is built, Phase 2)*
- [x] `/auth/me` exposes `accountType`, `studentStatus`, `isVerifiedStudent`, `university` — *2026-06-26*
- [x] `GET /auth/universities` returns the active partner list — *2026-06-26*
- [ ] Verified-student badge renders per state (verified / pending / none) *(mobile — pending)*

## Acceptance Criteria — Iteration 1 *(done)*

- [x] User with @tu-ilmenau.de email can register and receives a verification email *(email send pending Resend domain verification — DEBT-011)*
- [x] ~~User with unsupported domain sees a clear error message (422 UNIVERSITY_NOT_SUPPORTED)~~ — **superseded by Identity v2** (domains are no longer rejected; non-/other-students are valid accounts)
- [x] Verification link works once; second click shows "link expired or already used"
- [x] Expired token (>24h) shows "link expired" with option to resend *(POST /auth/resend-verification)*
- [x] Unverified user cannot call any authenticated endpoint (401) *(EMAIL_NOT_VERIFIED on login)*
- [x] Login with wrong password shows "Invalid credentials" (not which field is wrong)
- [x] Refresh token rotates on every use *(verified live: rotated token; post-logout refresh → 401)*
- [x] Logout invalidates the refresh token server-side
- [x] All unit specs pass *(121 unit tests)*
- [x] All integration specs pass against test database *(25 integration tests)*

---

## Seed Data

```sql
INSERT INTO universities (id, name, email_domain, country, active)
VALUES (gen_random_uuid(), 'TU Ilmenau', 'tu-ilmenau.de', 'Germany', true);
```
