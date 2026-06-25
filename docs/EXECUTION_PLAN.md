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
| E2E (Phase 5) | Maestro (preferred) or Detox | register→login→browse happy path on a simulator | `e2e/` flows; not in CI until stable |

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

## Phase 1 — Epic 4 Housing, backend

Mirror the Marketplace vertical slice (it's the proven template). Build order matches `ROADMAP` stories 4.2–4.8.

1. Domain: `housing-listing.entity.ts` (+ status transitions), `housing-image.entity.ts`, repo interface.
2. Infrastructure: `prisma-housing-listing.repository.ts`, `housing.infrastructure.module.ts` (reuse `STORAGE_SERVICE`).
3. Application use cases (UC-4.1…4.6) + `housing.application.module.ts`.
4. Presentation: `housing.controller.ts` + DTOs + Swagger; `OptionalJwtAuthGuard` on public GETs.
5. Register module in `app.module.ts`.

**Done when:** all UC unit specs + create/list/get integration specs green; endpoints verified live via curl.

---

## Phase 2 — Epic 4 Housing, mobile

- `lib/api/housing.ts` (typed methods) + spec.
- `useHousing` hook (mirror `useMarketplace`) + spec.
- `(tabs)/housing/` route group: grid, `[id]` detail, create; add Housing tab to `(tabs)/_layout.tsx`.
- Screen tests (M4.4).

**Done when:** housing browse + create work against the live API on a simulator; screen tests green.

---

## Phase 3 — Epic 3 Clubs, backend

New concepts vs. Marketplace: membership, roles (admin/member), feed. Follow `EPIC-003-CLUBS.md` UC-3.1…3.9.

1. Domain: club / membership / post entities with role + invariant logic (e.g. cannot leave as last admin).
2. Infra repos + module.
3. Use cases (create/dissolve, join/leave, post/feed, list, remove-member, transfer-admin) + module.
4. Controller: 10 endpoints per epic doc, with member/admin guards.

**Done when:** UC unit specs + membership/role integration specs green; endpoints verified live.

---

## Phase 4 — Epic 3 Clubs, mobile

- `lib/api/clubs.ts` + spec; `useClubs` hook + spec.
- `(tabs)/clubs/` route group: discovery, detail, feed; add Clubs tab.
- Screen tests (M3.4).

---

## Phase 5 — Integration hardening & E2E

- [ ] FT.4 — Evaluate Maestro vs Detox; add one happy-path E2E (register→verify→login→browse marketplace/housing).
- [ ] Verify deep-link email-verification path end-to-end on a device.
- [ ] Revisit deferred debt that blocks "production-real" use: DEBT-002 (thumbnails), DEBT-011 follow-ups.

---

## Spec File Tracker

Every spec file this plan introduces. Update the Status column as they land (`[ ]` → `[x]`). Keep new specs next to their source, matching existing naming.

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
