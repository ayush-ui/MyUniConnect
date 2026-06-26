# Execution Plan — Completing the Epics

_Created: 2026-06-25. Companion to [`ROADMAP.md`](ROADMAP.md) (status board) and the per-epic docs in [`epics/`](epics/). This file is the **actionable sequence** with testing strategy and a tracked list of every spec file to create._

---

## Baseline (verified 2026-06-25)

- **API** (`apps/api`, NestJS, DDD layering): Auth + Marketplace complete. **121 unit + 25 integration** tests green. Build clean.
- **Mobile** (`apps/mobile`, Expo/RN): Auth + Marketplace screens complete. **66** tests green — but only API layers, `AuthContext`, `useMarketplace`, and storage are covered. **No screen/component tests. No E2E.**
- **Frontend is mobile-only.** `apps/web` removed.
- Email works via Resend (`mail.unisyncapp.com`). Open debt: DEBT-012 (resend rate limit), DEBT-002 (image thumbnails), DEBT-004 (messaging stub), DEBT-005 (notifications).

---

## Testing strategy (applies to every phase)

| Layer | Tool | Scope | Convention |
|-------|------|-------|------------|
| Backend unit | Jest + `@nestjs/testing` | Each use case in isolation; repos/email/storage mocked | `*.use-case.spec.ts` next to source |
| Backend integration | Jest + real Postgres (`postgres_test`:5433) | Use case + Prisma repo against DB; external services faked | `*.integration.spec.ts`; run `pnpm test:integration` |
| Mobile unit | Jest + jest-expo | API layers, hooks, context, storage | `*.spec.ts(x)` next to source |
| Mobile component/screen | `@testing-library/react-native` | Render, validation, error mapping, navigation (mock API layer) | `*.spec.tsx` next to component/screen |
| E2E (Phase 6) | Maestro (preferred) or Detox | register→login→browse happy path on a simulator | `e2e/` flows; not in CI until stable |

**Rules** (from `ARCHITECTURE.md`): every use case ships with a unit spec; data-touching use cases also get an integration spec; mock external services (email, S3); never call raw `fetch` in components — go through `lib/api/`. A PR is not done until `pnpm test` (api), `pnpm test:integration` (api), and `pnpm --filter mobile test` are all green.

---

## Phase 0 — Stabilize & backfill ✅ DONE (2026-06-25)

Closed the testing gap on what's *already shipped* before adding new surface area.

- [x] FT.1 — `components/ui/*` tests (Button, FormField, StatusBadge) — 15 tests
- [x] FT.2 — Screen tests: login, register, check-email (validation, server-error mapping, navigation, resend banner) — 17 tests
- [x] FT.3 — Screen tests: marketplace index / detail / create — 17 tests
- [x] DEBT-012 — `EmailThrottlerGuard` on `POST /auth/resend-verification` (3/hour per email) + spec; verified live (4th req → 429)

**Result:** mobile 66 → **112** tests; API 121 → **124** unit (+25 integration). All green; build clean.

---

## Phase 1 — Identity v2: account types & verified-student gating  ✅ DONE (2026-06-26, backend + mobile)

Merged to `main` (branch `feat/identity-v2-account-types`: backend `999a212`, mobile `8db7bc2`). **Mobile half done:** signup chooser → searchable university picker → "Other" free-text → register fields → 3 check-email variants; `VerifiedStudentBadge` + `SearchablePicker` + `LockedSheet`; new Profile tab with 3 account states + pending "under review" panel; marketplace "+" gated via `LockedSheet` + defensive 403; `lib/api/auth.ts` types updated (`/auth/me` also returns `claimedUniversityName`). Built against captured Figma frames (`81:2`–`99:93`). **UniSync branding** landed too (app name/icon/splash, brand kit in `apps/mobile/assets/brand/`, email + Swagger copy). Tests: **mobile 112→133; API 124→140 unit + 25→29 integ.** New debt: DEBT-018/019/020/021. *Next: Phase 2 — Housing backend.*

Why first: Housing inherits the "students post, others browse" rule, so the gate must exist before we add a second posting surface. Full design in `ARCHITECTURE.md` "Identity & Account Model", `docs/epics/EPIC-001-AUTH.md`, and the UX in `docs/mobile/UI_BRIEF-account-types-and-signup.md`.

**Backend — ✅ DONE (2026-06-26).** Migration `20260626150721_identity_v2_account_types` (account-type/student-status/verified/claimed-name columns, nullable `university_id`, `StudentVerificationRequest` table, backfill existing users → verified). RegisterUser branches + dropped `UNIVERSITY_NOT_SUPPORTED`; VerifyEmail auto-promotes partner-domain students; `GET /auth/universities`; `VerifiedStudentGuard` (403 `STUDENT_VERIFICATION_REQUIRED`) on marketplace create; `accountType`/`studentStatus`/`isVerifiedStudent` in JWT + `/auth/me` (+ `university`); DEBT-014 stub replaced with the real flag. Tests: **140 unit + 29 integration** green; verified live via curl (all register branches, auto-promote, gated create 403, verified create reaches business logic). *Mobile half below is next, after Figma reconnect.*
1. **Migration**: add `account_type`, `student_status`, `is_verified_student`, `claimed_university_name`; make `university_id` nullable; add `StudentVerificationRequest`. Backfill existing users → verified students. (story 5.1)
2. **Revise `RegisterUser`** (UC-1.1): account-type branches, partner vs "Other", drop `UNIVERSITY_NOT_SUPPORTED`. Revise+expand specs. (5.2)
3. **Email-domain detection** + promote pending→verified on email verification (UC-1.2). (5.3)
4. **`VerifiedStudentGuard`** + `403 STUDENT_VERIFICATION_REQUIRED`; add `isVerifiedStudent`/`accountType`/`studentStatus` to JWT payload + `/auth/me`. Apply guard to marketplace create (and housing create when built). (5.4)
5. **`GET /auth/universities`** (UC-1.7). (5.5)
6. **Fix** `isVerifiedStudent: !!user` in marketplace controller → real flag (resolves DEBT-014). (5.6)

**Mobile — ✅ DONE (2026-06-26).** Built against the captured Figma frames.
7. Signup redesign (chooser → searchable university picker → "Other" free-text → check-email variants). (M5.1) ✅
8. `VerifiedStudentBadge` (verified/pending/visitor). (M5.2) ✅
9. Gate post entry points + explanatory sheets; account status panel. (M5.3, M5.4) ✅
10. Update `lib/api/auth.ts` types (`MeResult` gains the new fields) + `register` signature. ✅

**Done when:** non-students can sign up + browse but get `403`/gated UI on create; partner students auto-verify on email link; "Other" students land `pending` with a `StudentVerificationRequest`; all new specs green; `/auth/me` carries the new fields. *(Manual "Other" approval stays out-of-band until the CMS — DEBT-017.)*

---

## Phase 2 — Epic 4 Housing, backend

Mirror the Marketplace vertical slice (it's the proven template). Build order matches `ROADMAP` stories 4.2–4.8.

1. Domain: `housing-listing.entity.ts` (+ status transitions), `housing-image.entity.ts`, repo interface.
2. Infrastructure: `prisma-housing-listing.repository.ts`, `housing.infrastructure.module.ts` (reuse `STORAGE_SERVICE`).
3. Application use cases (UC-4.1…4.6) + `housing.application.module.ts`.
4. Presentation: `housing.controller.ts` + DTOs + Swagger; `OptionalJwtAuthGuard` on public GETs; **`VerifiedStudentGuard` on create** (from Phase 1).
5. Register module in `app.module.ts`.

**Done when:** all UC unit specs + create/list/get integration specs green; endpoints verified live via curl.

---

## Phase 3 — Epic 4 Housing, mobile

- `lib/api/housing.ts` (typed methods) + spec.
- `useHousing` hook (mirror `useMarketplace`) + spec.
- `(tabs)/housing/` route group: grid, `[id]` detail, create; add Housing tab to `(tabs)/_layout.tsx`.
- Screen tests (M4.4).

**Done when:** housing browse + create work against the live API on a simulator; screen tests green.

---

## Phase 4 — Epic 3 Clubs, backend

New concepts vs. Marketplace: membership, roles (admin/member), feed. Follow `EPIC-003-CLUBS.md` UC-3.1…3.9.

1. Domain: club / membership / post entities with role + invariant logic (e.g. cannot leave as last admin).
2. Infra repos + module.
3. Use cases (create/dissolve, join/leave, post/feed, list, remove-member, transfer-admin) + module.
4. Controller: 10 endpoints per epic doc, with member/admin guards.

**Done when:** UC unit specs + membership/role integration specs green; endpoints verified live.

---

## Phase 5 — Epic 3 Clubs, mobile

- `lib/api/clubs.ts` + spec; `useClubs` hook + spec.
- `(tabs)/clubs/` route group: discovery, detail, feed; add Clubs tab.
- Screen tests (M3.4).

---

## Phase 6 — Integration hardening & E2E

- [ ] FT.4 — Evaluate Maestro vs Detox; add one happy-path E2E (register→verify→login→browse marketplace/housing).
- [ ] Verify deep-link email-verification path end-to-end on a device.
- [ ] Revisit deferred debt that blocks "production-real" use: DEBT-002 (thumbnails), DEBT-011 follow-ups.

---

## Spec File Tracker

Every spec file this plan introduces. Update the Status column as they land (`[ ]` → `[x]`). Keep new specs next to their source, matching existing naming.

### Identity v2 (Epic 5)
| Spec file | Type | Status |
|-----------|------|--------|
| `apps/api/src/application/auth/register-user.use-case.spec.ts` _(revise + expand for account types / "Other")_ | unit | `[x]` |
| `apps/api/src/application/auth/register-user.use-case.integration.spec.ts` _(new — pending request + nullable university)_ | integ | `[x]` |
| `apps/api/src/application/auth/verify-email.use-case.spec.ts` _(extend — pending→verified promotion)_ | unit | `[x]` |
| `apps/api/src/application/auth/list-universities.use-case.spec.ts` | unit | `[x]` |
| `apps/api/src/presentation/auth/guards/verified-student.guard.spec.ts` | unit | `[x]` |
| `apps/mobile/app/(auth)/register.spec.tsx` _(extend — student/non-student + "Other" branches)_ | screen | `[x]` |
| `apps/mobile/app/(auth)/signup-account-type.spec.tsx` _(new — chooser routing)_ | screen | `[x]` |
| `apps/mobile/app/(auth)/signup-university.spec.tsx` _(new — picker + "Other" reveal)_ | screen | `[x]` |
| `apps/mobile/app/(tabs)/profile.spec.tsx` _(new — 3 account states + pending panel)_ | screen | `[x]` |
| `apps/mobile/app/(tabs)/marketplace/index.spec.tsx` _(extend — posting gate sheets)_ | screen | `[x]` |
| `apps/mobile/components/ui/VerifiedStudentBadge.spec.tsx` | component | `[x]` |
| `apps/mobile/lib/api/auth.spec.ts` _(extend — new register fields, MeResult fields)_ | unit | `[x]` |

### Backend — Housing (Epic 4)
| Spec file | Type | Status |
|-----------|------|--------|
| `apps/api/src/application/housing/create-housing-listing.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/housing/create-housing-listing.use-case.integration.spec.ts` | integ | `[ ]` |
| `apps/api/src/application/housing/list-housing-listings.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/housing/get-housing-listing.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/housing/get-housing-listing.use-case.integration.spec.ts` | integ | `[ ]` |
| `apps/api/src/application/housing/update-housing-listing.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/housing/update-housing-listing-status.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/housing/get-my-housing-listings.use-case.spec.ts` | unit | `[ ]` |

### Backend — Clubs (Epic 3)
| Spec file | Type | Status |
|-----------|------|--------|
| `apps/api/src/application/clubs/create-club.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/dissolve-club.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/join-club.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/join-club.use-case.integration.spec.ts` | integ | `[ ]` |
| `apps/api/src/application/clubs/leave-club.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/post-to-club.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/get-club-feed.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/list-clubs.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/remove-member.use-case.spec.ts` | unit | `[ ]` |
| `apps/api/src/application/clubs/transfer-admin.use-case.spec.ts` | unit | `[ ]` |

### Backend — Auth hardening
| Spec file | Type | Status |
|-----------|------|--------|
| `apps/api/src/presentation/auth/guards/email-throttler.guard.spec.ts` (resend rate limit, DEBT-012) | unit | `[x]` |

### Mobile — new
| Spec file | Type | Status |
|-----------|------|--------|
| `apps/mobile/lib/api/housing.spec.ts` | unit | `[ ]` |
| `apps/mobile/hooks/useHousing.spec.ts` | unit | `[ ]` |
| `apps/mobile/lib/api/clubs.spec.ts` | unit | `[ ]` |
| `apps/mobile/hooks/useClubs.spec.ts` | unit | `[ ]` |
| `apps/mobile/app/(tabs)/housing/__tests__/*.spec.tsx` | screen | `[ ]` |
| `apps/mobile/app/(tabs)/clubs/__tests__/*.spec.tsx` | screen | `[ ]` |

### Mobile — backfill (Phase 0) ✅
| Spec file | Type | Status |
|-----------|------|--------|
| `apps/mobile/components/ui/Button.spec.tsx` | component | `[x]` |
| `apps/mobile/components/ui/FormField.spec.tsx` | component | `[x]` |
| `apps/mobile/components/ui/StatusBadge.spec.tsx` | component | `[x]` |
| `apps/mobile/app/(auth)/login.spec.tsx` | screen | `[x]` |
| `apps/mobile/app/(auth)/register.spec.tsx` | screen | `[x]` |
| `apps/mobile/app/(auth)/check-email.spec.tsx` | screen | `[x]` |
| `apps/mobile/app/(tabs)/marketplace/index.spec.tsx` | screen | `[x]` |
| `apps/mobile/app/(tabs)/marketplace/detail.spec.tsx` _(tests `[id].tsx`)_ | screen | `[x]` |
| `apps/mobile/app/(tabs)/marketplace/create.spec.tsx` | screen | `[x]` |

> When a spec file here is created, also tick the matching story in `ROADMAP.md`. Any spec file created but left unfilled for >1 phase is a dead-weight orphan — delete it (per the Abandoned Code Policy in ROADMAP).
