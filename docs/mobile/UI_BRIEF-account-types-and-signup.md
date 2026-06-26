# UI Brief — Account Types, Student Verification & Signup Redesign

**Audience:** the UI/design development agent.
**Status:** design brief — no app code yet. Produce designs + component specs that the app build can consume.
**Source of truth for the model:** `docs/ARCHITECTURE.md` → "Identity & Account Model (v2)". **Business reasoning:** `docs/BUSINESS_MODEL.md` §2. **Backend stories:** `docs/epics/EPIC-001-AUTH.md`.

---

## 1. What changed and why

**Before:** the app assumed every account was a verified student of a partner university. Signup just took name/email/password, the backend rejected any non-partner email domain, and any logged-in user could post.

**Now (product decision):**
- We will let **non-students** create accounts so they can **browse** the marketplace and housing rentals in-app — but they can **never post anything**.
- **Students** get full privileges (posting + benefits) **only once verified** as a real student of a **partner university**.
- A student whose university isn't a partner yet can still sign up via an **"Other (Not listed)"** path; they're put in a **pending** state and approved manually by our team later (via a future CMS). Once approved, their university becomes a partner and they're upgraded to verified.
- Trust is shown through a **verified-student badge**.

**Why:** "who can post" is the trust moat (every seller is a real, verified student). "Who can browse" can be wider without diluting that moat. Letting outsiders hold view-only accounts grows reach; keeping posting student-only keeps the community trustworthy.

---

## 2. The three account states the UI must represent

The UI keys everything off two values the API will expose on the user object (`/auth/me`): `accountType` and `studentStatus` (→ derived `isVerifiedStudent`).

| State | accountType / studentStatus | Can browse? | Can post? | Badge |
|-------|------------------------------|-------------|-----------|-------|
| **A. Verified student** | `student` / `verified` | ✅ | ✅ | ✅ Verified-student badge (with university) |
| **B. Pending student** | `student` / `pending` | ✅ | ❌ (locked) | ⏳ "Verification pending" |
| **C. Non-student** | `non_student` / `none` | ✅ | ❌ (never) | none (or subtle "Visitor") |

> Posting entry points (the marketplace "+" button, the future housing "+", create screens) must be **gated** for B and C — hidden or shown in a locked/disabled state with an explanation. Browsing, detail views, and search remain fully available to all three.

---

## 3. Signup flow redesign (the main work)

Replace the single register form with a short branching flow. Keep it light — one extra decision, then a conditional field.

### Step 1 — "Are you a student?"
A clear binary choice early in signup (segmented control or two large cards):
- **"I'm a student"** → Step 2.
- **"I'm not a student"** → skip to the standard fields (Step 3) as a non-student.

Copy idea: *"Students can buy, sell, and post. Non-students can browse listings."*

### Step 2 — University selection (students only)
- A **searchable dropdown / picker** of partner universities (the list comes from `GET /auth/universities` — to be added; for now seeded with TU Ilmenau).
- Always include a final option: **"Other (Not listed above)"**.
  - If a partner university is selected → continue normally; this is the fast/automated path.
  - If **"Other (Not listed above)"** is selected → reveal a **free-text field: "Which university do you attend?"** (required). Show a short note: *"We'll review and approve your account. You can browse right away; posting unlocks once you're verified."*

### Step 3 — Standard fields (all users)
First name, last name, **university email**, password, confirm password (unchanged from today's register form). For students, copy should nudge them to use their **university email** (that's what enables automatic verification when the domain matches the selected university).

### After submit
- Route to the existing **check-email** screen (unchanged mechanic: everyone verifies email via the link).
- The check-email screen should additionally communicate the *next* state:
  - Partner student → "Verify your email to start posting."
  - **Pending / Other** student → "Verify your email. Your student status is under review — we'll notify you once approved. You can browse in the meantime."
  - Non-student → "Verify your email to start browsing."

> Design all of: the student/non-student chooser, the searchable university picker, the "Other" free-text reveal, and the three check-email variants.

---

## 4. The verified-student badge (new component)

A reusable badge with at least three visual states. It is the single most important trust signal.

| Variant | Where it appears | Visual intent |
|---------|------------------|---------------|
| **Verified student** | User's own profile/account screen; **prominently on `public` listings** (trust signal for outside buyers, e.g. "✓ Verified student · TU Ilmenau") | Confident, positive (check + university) |
| **Pending** | Own profile/account screen only | Neutral/in-progress (clock); not alarming |
| **Non-student / none** | Own account screen | Minimal or absent; optionally a subtle "Visitor" chip |

Note (from `BUSINESS_MODEL.md`): inside the app the badge is mostly *invisible* among students (everyone has it). Its high-value placement is on **public listings** where an outside web viewer sees it. Design that public-listing trust treatment too.

---

## 5. Gating & empty/locked states to design

For **pending students** and **non-students**:
- The marketplace (and future housing) **"+" / Create entry point**: design a **locked** treatment — e.g. hidden, or visible but tapping opens an explanatory sheet.
- **Explanatory sheet/CTA**:
  - Pending student: *"Posting unlocks once your student status is verified. We're reviewing your account."*
  - Non-student: *"Only verified students can post. You can browse all listings."*
- **Account/profile screen**: surface the user's current status and (for pending) a "Verification under review" panel. (A future "Request verification" action ties into the CMS — out of scope to build now, but leave space for it.)

If the API returns `403 STUDENT_VERIFICATION_REQUIRED` on a create attempt, the UI should fail gracefully into the same explanatory sheet (defensive — the button should already be gated).

---

## 6. Data contract the UI depends on (planned API shape)

The design should assume these fields exist (final names may shift; coordinate with backend via EPIC-001):

```jsonc
// GET /auth/me  → user object (additive fields)
{
  "id": "...", "email": "...", "firstName": "...", "lastName": "...",
  "emailVerified": true,
  "accountType": "student",          // "student" | "non_student"
  "studentStatus": "pending",        // "none" | "pending" | "verified" | "rejected"
  "isVerifiedStudent": false,        // derived gate for posting
  "university": { "id": "...", "name": "TU Ilmenau" } | null
}
```

```jsonc
// POST /auth/register  (request — additive fields)
{
  "firstName": "...", "lastName": "...", "email": "...", "password": "...",
  "accountType": "student",                 // required
  "universityId": "uuid-or-null",           // when a partner is picked
  "claimedUniversityName": "string-or-null" // when "Other (Not listed)" is picked
}
```

```jsonc
// GET /auth/universities  (new — to populate the dropdown)
[ { "id": "...", "name": "TU Ilmenau" } ]
```

---

## 7. Explicitly out of scope for this brief
- The **CMS / admin** approval tool (separate app + account, built later). The mobile app only *reflects* status; it doesn't approve.
- Email-domain auto-detection logic (backend concern; UI just sends the selected university + email).
- Payments/monetization, messaging.

## 8. Deliverables expected from the UI agent
1. Redesigned signup flow screens (student chooser → university picker w/ "Other" → fields → check-email variants).
2. `VerifiedStudentBadge` component spec (3 states) + its public-listing trust treatment.
3. Locked/gated states for create entry points + explanatory sheets (pending vs non-student copy).
4. Account/profile status panel (incl. pending "under review" state).
5. Any new primitive components needed (searchable picker, segmented chooser) noted for `components/ui/`.
