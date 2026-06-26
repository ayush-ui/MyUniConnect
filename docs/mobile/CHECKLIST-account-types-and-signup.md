# Design Checklist — Account Types, Verification & Signup Redesign

Derived from `UI_BRIEF-account-types-and-signup.md`, checked against the current Figma **Screens** page (UniSync). Each item is a real gap between the brief and what exists today.

**Legend:** `[ ]` todo · `[~]` partial · `[x]` done. Figma node IDs in `()`.

---

## A. Signup flow redesign (brief §3) — Register `(15:2)`
Current: single flat form (first/last name, university email, password, Create account). Copy: "only verified students can join."

- [ ] **A1. Step 1 — student vs non-student chooser.** Segmented control or two large cards: "I'm a student" / "I'm not a student". Helper copy: *"Students can buy, sell, and post. Non-students can browse listings."*
- [ ] **A2. Step 2 — university picker (students only).** Searchable dropdown/picker seeded from `GET /auth/universities` (TU Ilmenau for now). Always-present final option **"Other (Not listed above)"**.
- [ ] **A3. "Other" free-text reveal.** When "Other" picked → required field *"Which university do you attend?"* + note: *"We'll review and approve your account. You can browse right away; posting unlocks once you're verified."*
- [ ] **A4. Step 3 — standard fields.** Keep first/last name, university email, password; **add confirm-password** (brief §3 lists it; current screen lacks it). Student copy nudges using the **university email** for auto-verification.
- [ ] **A5. Branch wiring.** Non-student path skips Step 2 → straight to fields. Student path: chooser → picker → ("Other" reveal) → fields.
- [ ] **A6. Update intro copy.** Current "only verified students can join" contradicts the new non-student browsing path — rewrite.

## B. Check-email variants (brief §3 "After submit") — `(15:34)`
Current: one generic variant ("…activate your account").

- [ ] **B1. Partner student variant** — *"Verify your email to start posting."*
- [ ] **B2. Pending / Other student variant** — *"Verify your email. Your student status is under review — we'll notify you once approved. You can browse in the meantime."*
- [ ] **B3. Non-student variant** — *"Verify your email to start browsing."*
- [ ] **B4. Keep resend mechanic** (unchanged) across all three.

## C. VerifiedStudentBadge component (brief §4) — new
- [ ] **C1. Verified state** — check + university (e.g. "✓ Verified student · TU Ilmenau"). Confident/positive.
- [ ] **C2. Pending state** — clock, neutral/in-progress, not alarming. Own profile only.
- [ ] **C3. Non-student/none state** — minimal/absent; optional subtle "Visitor" chip.
- [ ] **C4. Public-listing trust treatment** — prominent variant for outside web viewers on `public` listings.

## D. Badge & status placement
- [ ] **D1. Listing Detail `(15:98)`** — add verified-student badge near "Listed by Max M." (public-listing trust treatment from C4).
- [ ] **D2. Profile `(33:2)`** — surface current account status + badge (verified / pending / visitor).
- [ ] **D3. Profile — pending "Verification under review" panel.** Leave space for a future "Request verification" CTA (CMS, out of scope to build).
- [ ] **D4. (Optional) Marketplace Grid card badge** — consider verified marker on listing cards `(15:63)`.

## E. Gating & locked states (brief §5)
Applies to pending students (B) and non-students (C).

- [ ] **E1. Locked "+" / Create entry point** on Marketplace Grid `(15:63)` (and future Housing). Hidden, or visible-but-locked opening an explanatory sheet. *Note: no "+" entry point is currently visible on the grid — add one, then design its gated state.*
- [ ] **E2. Explanatory sheet — pending student** — *"Posting unlocks once your student status is verified. We're reviewing your account."*
- [ ] **E3. Explanatory sheet — non-student** — *"Only verified students can post. You can browse all listings."*
- [ ] **E4. 403 fallback.** `403 STUDENT_VERIFICATION_REQUIRED` on create → same explanatory sheet (defensive; button should already be gated).
- [ ] **E5. Confirm browse/detail/search stay open** to all three states (no gating on view paths).

## F. New primitive components for `components/ui/` (brief §8.5)
- [ ] **F1. Searchable picker** (university dropdown w/ search + "Other" terminal option).
- [ ] **F2. Segmented chooser** (student / non-student).
- [ ] **F3. Explanatory/locked bottom sheet** (reused by E2/E3/E4).

---

## Out of scope (brief §7) — do NOT design
- CMS / admin approval tool.
- Email-domain auto-detection logic.
- Payments / monetization / messaging.

## Open questions before we start
1. **Branding:** design says **UniSync**, repo is **MyUniConnect** — which name is canonical for these screens?
2. **Mode:** are these changes to be made **in Figma** (design tool, read-only via MCP here) or translated into **app code** in this repo? The brief says "no app code yet," but the repo already has mobile screens/tests.
3. **Partner-student auto-verify:** does verified state apply immediately after email verification, or is there an interim "verifying domain" state to design?
