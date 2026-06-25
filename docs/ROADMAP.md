# Execution Roadmap

## Status Labels

| Label | Meaning |
|-------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[!]` | Blocked / needs decision |
| `[D]` | Deferred to later iteration |

---

## Iteration 1 — Foundation (Current)

Goal: Working authentication end-to-end on both API and mobile. A user can register with a TU Ilmenau email, verify it, and log in on the mobile app.

### Epic 1 — Authentication & Identity (Backend)
> File: `docs/epics/EPIC-001-AUTH.md`

| # | Story | Status | Notes |
|---|-------|--------|-------|
| 1.1 | Monorepo & project scaffold | `[x]` | pnpm workspaces, NestJS, Next.js |
| 1.2 | Database schema — users, universities | `[x]` | Prisma schema created |
| 1.3 | University domain validation (TU Ilmenau seed) | `[x]` | Seed file created |
| 1.4 | User registration use case + spec | `[x]` | RegisterUserUseCase + 10 unit tests |
| 1.5 | Email verification token — send + verify + resend | `[x]` | VerifyEmailUseCase + ResendVerificationUseCase (UC-1.3); POST /auth/resend-verification (no email enumeration); 7+8 unit + 4+4 integration tests; Swagger docs |
| 1.6 | Login use case + JWT issuance | `[x]` | LoginUseCase + ITokenService; 11 unit + 5 integration tests; POST /api/v1/auth/login; httpOnly refresh_token cookie |
| 1.7 | Refresh token + logout | `[x]` | RefreshAccessTokenUseCase + LogoutUseCase; token rotation; 8 unit + 8 integration tests |
| 1.8 | Auth guard (NestJS) | `[x]` | JwtAuthGuard + CurrentUser decorator + GET /auth/me; 6 guard unit + 3 use-case unit tests |
| 1.9 | Registration + login UI (Next.js) | `[x]` | /register, /login, /register/check-email, /dashboard stub |
| 1.10 | Email verification landing page (Next.js) | `[x]` | /verify-email: auto-verifies on load, success redirect, expired-link resend |

### Epic 1 — Mobile Integration (React Native)
> Mobile auth wired to the Epic 1 API. See `docs/mobile/MOBILE_ARCHITECTURE.md` for conventions.

| # | Story | Status | Notes |
|---|-------|--------|-------|
| M1.1 | Mobile project scaffold | `[x]` | Expo + NativeWind + expo-router; pnpm workspace |
| M1.2 | API client + token storage | `[x]` | `lib/api/client.ts`; `lib/auth/storage.ts` (expo-secure-store); cookie parsing workaround |
| M1.3 | Auth API layer | `[x]` | `lib/api/auth.ts` — typed methods for all 6 endpoints; 9 unit tests |
| M1.4 | AuthContext + session restore | `[x]` | `context/AuthContext.tsx`; auto-refresh 2 min before expiry; 10 unit tests |
| M1.5 | Register screen | `[x]` | Full 5-field form; inline + server error mapping; routes to check-email |
| M1.6 | Login screen | `[x]` | Wired to AuthContext; EMAIL_NOT_VERIFIED resend banner |
| M1.7 | Check-email screen | `[x]` | Post-registration; resend verification |
| M1.8 | Auth guard on tabs | `[x]` | Tabs layout redirects unauthenticated users to login; Ionicons tab bar |
| M1.9 | Home stub + logout | `[x]` | Displays user name/email; logout clears tokens and redirects |
| M1.10 | Mobile test infrastructure | `[x]` | jest-expo + @testing-library/react-native; 66 tests passing (5 suites) |

---

### Epic 2 — Marketplace (Buy & Sell) — Backend
> File: `docs/epics/EPIC-002-MARKETPLACE.md`

| # | Story | Status | Notes |
|---|-------|--------|-------|
| 2.1 | DB schema — listings, categories, images | `[x]` | In Prisma schema; categories seeded |
| 2.2 | Create listing use case + spec | `[x]` | CreateListingUseCase; 11 unit + 3 integration tests; image key ownership check |
| 2.3 | Visibility toggle (students-only vs public) | `[x]` | ListListingsUseCase respects isVerifiedStudent flag; GetListingUseCase enforces visibility |
| 2.4 | List / search / filter listings | `[x]` | ListListingsUseCase; category/condition/price/search/sort/pagination; 6 unit tests |
| 2.5 | Single listing detail page | `[x]` | GetListingUseCase; 4 unit tests; FORBIDDEN for students_only to guests |
| 2.6 | Image upload (presigned S3 URL flow) | `[x]` | GetPresignedUploadUrlUseCase; StubStorageService (DEBT-008); 5 unit tests |
| 2.7 | Edit / deactivate own listing | `[x]` | UpdateListingUseCase (5 unit) + UpdateListingStatusUseCase (11 unit); valid status transitions in domain entity |
| 2.8 | Marketplace UI — listing grid | `[x]` | Category chips via `useMarketplace` hook, pull-to-refresh, FlatList; 10 hook unit tests |
| 2.9 | Listing detail UI | `[x]` | Hero image, description, sticky CTA |
| 2.10 | Contact seller (in-app message stub) | `[x]` | Alert stub (DEBT-004); full messaging in Iteration 2 |
| 2.11 | Create listing UI | `[x]` | Photo picker (expo-image-picker), category/condition pickers, students-only toggle |
| 2.12 | Marketplace API layer | `[x]` | `lib/api/marketplace.ts` — /api/v1 prefix fixed; 7 missing methods added; 21 unit tests |

### Epic 3 — Clubs & Communities
> File: `docs/epics/EPIC-003-CLUBS.md`

| # | Story | Status | Notes |
|---|-------|--------|-------|
| 3.1 | DB schema — clubs, memberships, posts | `[x]` | In Prisma schema |
| 3.2 | Create club use case + spec | `[ ]` | |
| 3.3 | Join / leave club | `[ ]` | |
| 3.4 | Club feed — post + read posts | `[ ]` | |
| 3.5 | Club discovery page | `[ ]` | |
| 3.6 | Club detail UI | `[ ]` | |

### Epic 4 — Housing & Sublets
> File: `docs/epics/EPIC-004-HOUSING.md`

| # | Story | Status | Notes |
|---|-------|--------|-------|
| 4.1 | DB schema — housing listings | `[x]` | In Prisma schema |
| 4.2 | Create housing listing use case + spec | `[ ]` | |
| 4.3 | Search / filter housing | `[ ]` | |
| 4.4 | Housing listing detail UI | `[ ]` | |
| 4.5 | Housing grid UI | `[ ]` | |

---

## Iteration 2 — Enrichment (Planned)

| Epic | Feature | Notes |
|------|---------|-------|
| Auth | Multi-university support (UI to add universities) | Schema already supports it |
| Auth | OAuth SSO (university IdP) | After email flow proven |
| Marketplace | In-app messaging between buyer/seller | Full chat feature |
| Marketplace | Offer / negotiation flow | |
| Marketplace | Reporting / flagging listings | |
| Clubs | Club roles (admin, moderator, member) | |
| Clubs | Event announcements within clubs | |
| Housing | Map view (Leaflet / Mapbox) | |
| Housing | Saved/bookmarked listings | |
| Platform | Notification system (in-app + email) | |
| Platform | User profile page | |

---

## Iteration 3 — Scale (Planned)

| Item | Notes |
|------|-------|
| Redis token revocation | Replace DB-based revocation list |
| PgBouncer / Prisma Accelerate | DB connection pooling |
| CDN for images | CloudFront in front of S3 |
| Full-text search | Postgres `tsvector` or Meilisearch |
| Admin dashboard | University onboarding, moderation tools |

---

## Abandoned Code Policy

- Any file not referenced by a test or import within 2 sprints of creation is deleted
- Unused modules are tracked in TECHNICAL_DEBT.md under "Orphans"
- Every PR must not leave unreachable exports or dead routes

---

## Execution Order

```
EPIC-001 Backend → EPIC-001 Mobile → EPIC-002 Backend → EPIC-002 Mobile → …
```

Backend use cases are built and tested first. Mobile screens are wired after the API contract is stable. We do not start Epic 2 until Epic 1 mobile integration is complete and the auth flow works end-to-end on a physical device.
