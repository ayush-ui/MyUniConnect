# Technical Debt Register

Items here are known shortcuts or deferred improvements. Each entry has a label:

- `[DEBT]` — shortcut taken knowingly, must revisit
- `[VO]` — value object deferred
- `[INFRA]` — infrastructure improvement deferred
- `[ORPHAN]` — file/module flagged as potentially abandoned

---

## Value Objects — Deferred

| ID | VO | Reason Deferred | When to Revisit |
|----|-----|----------------|-----------------|
| VO-001 | `Price` / Money | Single currency (EUR) for now | Before multi-currency or payment integration |
| VO-002 | `PhoneNumber` | No phone features in Iteration 1 | Before SMS verification added |
| VO-003 | `Slug` | Auto-generated IDs used for URLs now | Before SEO-friendly URL routing needed |
| VO-004 | `Address` | Free-text location field for now | Before map view in housing (Iteration 3) |
| VO-005 | `Username` | No username system yet | Before public profiles launched |

---

## Infrastructure — Deferred

| ID | Item | Reason Deferred | When to Revisit |
|----|------|----------------|-----------------|
| INFRA-001 | Redis for refresh token revocation | File-based / DB revocation OK for MVP | Before scale-out (Iteration 3) |
| INFRA-002 | PgBouncer / connection pooling | Low traffic in early stage | Before load testing in Iteration 3 |
| INFRA-003 | CDN (CloudFront) for S3 images | Direct S3 URLs in dev | Before Iteration 2 goes to production |
| INFRA-004 | Full-text search (tsvector or Meilisearch) | ILIKE search fine for MVP | When listing count > 1000 |
| INFRA-005 | Rate limiting persistence (Redis) | In-memory throttler for now | Before production hardening |
| INFRA-006 | Email queue (Bull/BullMQ) | Direct SMTP send for now | If email delivery reliability becomes issue |

---

## Known Shortcuts

| ID | Location | Description | Fix When |
|----|---------|-------------|---------|
| DEBT-001 | Auth | Refresh tokens stored in DB, no revocation list | Before Iteration 3 (INFRA-001) |
| DEBT-002 | Images | No image resizing / thumbnail generation | Before mobile launch |
| DEBT-003 | Search | Listing search is simple ILIKE — no ranking | INFRA-004 |
| DEBT-004 | Messaging | "Contact seller" is a stub (mailto link) | Iteration 2 full messaging epic |
| DEBT-005 | Notifications | No real-time — polling only on initial build | Iteration 2 notification epic |
| ~~DEBT-006~~ | ~~Email~~ | ~~StubEmailService logs to console; no real SMTP~~ | **Resolved** — `ResendEmailService` sends verification emails via Resend (HTML + text); stub deleted |
| DEBT-007 | Auth | `ITokenService.signRefreshToken` accepts a `TokenPayload` param that is currently unused (tokens are opaque random bytes) | Clean up interface in Iteration 2 — remove param or replace with a dedicated `generateRefreshToken(): string` method |
| ~~DEBT-014~~ | ~~Auth / Authz~~ | ~~Identity v1 collapses two concepts: `marketplace.controller` treats any authenticated user as verified (`!!user`); no `accountType`/`student_status` model.~~ | **Resolved (2026-06-26, Identity v2)** — real `isVerifiedStudent` flag in JWT/`/auth/me`; `VerifiedStudentGuard` on marketplace create; controller now reads `user?.isVerifiedStudent`. |
| ~~DEBT-015~~ | ~~Auth~~ | ~~Registration rejects non-partner domains (`UNIVERSITY_NOT_SUPPORTED`).~~ | **Resolved (2026-06-26)** — RegisterUser no longer rejects on domain; non-/Other-students are valid accounts (Epic 5, story 5.2). |
| ~~DEBT-016~~ | ~~Auth~~ | ~~No email-domain → partner-university detection to auto-grant verified-student.~~ | **Resolved (2026-06-26)** — VerifyEmail promotes a pending student to verified when the email domain matches the selected partner university (Epic 5, story 5.3). |
| DEBT-017 | Platform / CMS | **No admin tool to approve "Other" student-verification requests.** Until the CMS exists, `StudentVerificationRequest`s are approved manually/out-of-band by the team. | Iteration 2 — CMS / Admin (see ROADMAP) |
| DEBT-013 | Mobile / Testing | Screen + component tests **added in Phase 0** (mobile 112 tests). Remaining: no E2E layer (Maestro/Detox) — flows verified manually only. | E2E in Phase 5 (FT.4) of `docs/EXECUTION_PLAN.md` |
| ~~DEBT-012~~ | ~~Auth~~ | ~~`POST /auth/resend-verification` has no rate limiting.~~ | **Resolved** — `EmailThrottlerGuard` limits resend to 3/hour per email (verified live: 4th request → 429). In-memory store; persistence still tracked by INFRA-005. |
| DEBT-011 | Email | Resend account is in test mode with no verified domain, so `EMAIL_FROM` is `onboarding@resend.dev` and sends only succeed to the account owner's address. Registration emails to real `*.tu-ilmenau.de` recipients are rejected (403) until a domain is verified. | Verify a sending domain at resend.com/domains and set `EMAIL_FROM` to an address on it — before any real-user testing |
| DEBT-010 | Mobile / Testing | `msw` v2+ is ESM-only; its transitive deps (`rettime`, `@open-draft/deferred-promise`) cannot be loaded in Jest's CJS mode. API layer tests use `jest.mock('./client')` instead of a real HTTP mock server. | Upgrade to `jest-expo` with experimental ESM mode, or replace with Vitest + native ESM when RN ecosystem fully supports it |
| ~~DEBT-008~~ | ~~Marketplace~~ | ~~`StubStorageService` generates fake presigned URLs; no real S3 calls~~ | **Resolved** — `S3StorageService` wired with Hetzner Object Storage |
| ~~DEBT-009~~ | ~~Marketplace~~ | ~~`GET /marketplace/listings` controller reads `req.user` directly (no guard)~~ | **Resolved** — `OptionalJwtAuthGuard` applied to `GET /listings` and `GET /listings/:id` |

---

## Orphan Watch List

Files flagged for review. If still unused after the next epic completes, delete them.

| File | Flagged On | Review By | Status |
|------|-----------|-----------|--------|
| _(none yet)_ | | | |

---

## Review Cadence

This file is reviewed at the start of each epic planning session.
Any `[ORPHAN]` item older than 2 epics is deleted without further discussion.
