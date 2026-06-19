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

Goal: Working authentication, basic marketplace listing, and CI/CD pipeline.
A user can register with a TU Ilmenau email, verify it, and post a marketplace item.

### Epic 1 — Authentication & Identity
> File: `docs/epics/EPIC-001-AUTH.md`

| # | Story | Status | Notes |
|---|-------|--------|-------|
| 1.1 | Monorepo & project scaffold | `[x]` | pnpm workspaces, NestJS, Next.js |
| 1.2 | Database schema — users, universities | `[x]` | Prisma schema created |
| 1.3 | University domain validation (TU Ilmenau seed) | `[x]` | Seed file created |
| 1.4 | User registration use case + spec | `[x]` | RegisterUserUseCase + 10 tests |
| 1.5 | Email verification token — send + verify | `[x]` | VerifyEmailUseCase + 7 unit + 4 integration tests; Swagger docs; bcryptjs |
| 1.6 | Login use case + JWT issuance | `[ ]` | |
| 1.7 | Refresh token + logout | `[ ]` | |
| 1.8 | Auth guard (NestJS) | `[ ]` | |
| 1.9 | Registration + login UI (Next.js) | `[ ]` | |
| 1.10 | Email verification landing page | `[ ]` | |

### Epic 2 — Marketplace (Buy & Sell)
> File: `docs/epics/EPIC-002-MARKETPLACE.md`

| # | Story | Status | Notes |
|---|-------|--------|-------|
| 2.1 | DB schema — listings, categories, images | `[x]` | In Prisma schema |
| 2.2 | Create listing use case + spec | `[ ]` | |
| 2.3 | Visibility toggle (students-only vs public) | `[ ]` | |
| 2.4 | List / search / filter listings | `[ ]` | |
| 2.5 | Single listing detail page | `[ ]` | |
| 2.6 | Image upload (presigned S3 URL flow) | `[ ]` | |
| 2.7 | Edit / deactivate own listing | `[ ]` | |
| 2.8 | Marketplace UI — listing grid | `[ ]` | |
| 2.9 | Listing detail UI | `[ ]` | |
| 2.10 | Contact seller (in-app message stub) | `[ ]` | |

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

## Iteration 3 — Mobile & Scale (Planned)

| Item | Notes |
|------|-------|
| React Native app | APIs from Iteration 1 are already mobile-ready |
| Redis token revocation | Replace in-memory approach |
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
EPIC-001 (Auth) → EPIC-002 (Marketplace) → EPIC-003 (Clubs) → EPIC-004 (Housing)
```

Each epic is independently shippable. We do not start Epic 2 until Epic 1's core
stories (1.1–1.8) are complete and tests are green.
