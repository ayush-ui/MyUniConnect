# Architecture

## Guiding Principles

- **Clean Architecture** — dependencies point inward. Domain layer knows nothing of frameworks.
- **TDD** — spec file exists before implementation.
- **Explicit over clever** — no magic. Every abstraction earns its place.
- **Fail fast, fail loud** — validation at system boundaries; trust internal code.

---

## Layer Rules (Backend — NestJS)

```
Presentation  →  Application  →  Domain  ←  Infrastructure
(Controllers)    (Use Cases)    (Entities)   (Repositories, ORM, Email)
```

| Layer | Lives in | Can depend on | Cannot depend on |
|-------|----------|--------------|-----------------|
| Domain | `domain/` | nothing | everything else |
| Application | `application/` | Domain | Infra, Presentation |
| Infrastructure | `infrastructure/` | Domain, Application | Presentation |
| Presentation | `presentation/` | Application | Domain directly |

### What goes where

**Domain**
- Entities (plain TypeScript classes, no decorators)
- Domain events
- Repository interfaces (`IUserRepository`, etc.)
- Domain service interfaces
- Value objects where semantically important (see Technical Debt for deferred VOs)

**Application**
- Use case classes (one public `execute()` method)
- DTOs (input/output shapes for use cases)
- Application service interfaces

**Infrastructure**
- Prisma repository implementations
- Email service (nodemailer / SES)
- S3 storage adapter
- NestJS modules, providers, DI wiring

**Presentation**
- NestJS controllers
- Guards, interceptors, pipes
- HTTP request/response DTOs (separate from application DTOs)

---

## Value Objects — Current Status

Value objects add type safety but cost complexity. We defer most; we implement those where bugs without them are likely.

### Implemented Now
| VO | Reason |
|----|--------|
| `Email` | Validates format + domain whitelist at construction |
| `UniversityDomain` | Central place for domain-to-university lookup |

### Deferred (see TECHNICAL_DEBT.md)
- `Price` (Money) — defer until multi-currency is needed
- `PhoneNumber` — defer until SMS verification added
- `Slug` — defer until SEO URL routing needed

---

## Database Schema Conventions

- All tables have `id` (UUID), `created_at`, `updated_at`
- Soft delete via `deleted_at` nullable timestamp (no hard deletes on user content)
- Enum types defined in Prisma schema, not as database CHECK constraints
- Foreign keys always indexed
- No polymorphic foreign keys — use separate junction tables

---

## Authentication Flow

```
POST /auth/register
  → validate email domain against universities table
  → create unverified user
  → send verification email with signed token (JWT, 24h TTL)

GET /auth/verify-email?token=...
  → verify token signature + expiry
  → mark user as verified
  → return session JWT

POST /auth/login
  → check user exists + is verified
  → check password (bcrypt)
  → return access token (15m) + refresh token (7d, httpOnly cookie)

POST /auth/refresh
  → validate refresh token
  → return new access token
```

---

## Error Handling Convention

All application errors extend `AppError`:

```typescript
class AppError extends Error {
  constructor(
    public readonly code: string,    // machine-readable, e.g. "EMAIL_NOT_VERIFIED"
    public readonly message: string, // human-readable
    public readonly statusCode: number,
  ) {}
}
```

Controllers catch `AppError` and map to HTTP responses. Unexpected errors are caught by a global exception filter and return `500` without leaking internals.

---

## Testing Strategy

| Test type | Tool | What it covers |
|-----------|------|---------------|
| Unit | Jest | Use cases, domain logic, utilities |
| Integration | Jest + test DB | Repository implementations, full use case with real DB |
| E2E | Playwright | Critical user flows (register → verify → post listing) |

- Each use case has a `.spec.ts` file in the same directory
- Test DB is a separate PostgreSQL database, migrated fresh per test suite
- No mocking of the database in integration tests — use real Prisma + test DB
- Mocking is allowed for external services (email, S3)

---

## Frontend Architecture (Next.js)

```
app/                     # Next.js App Router pages
components/
  ui/                    # Primitive components (Button, Input, Card)
  features/              # Feature-specific composed components
lib/
  api/                   # Typed API client (fetch wrappers)
  auth/                  # Session helpers, guards
hooks/                   # Custom React hooks
types/                   # Re-exports from @myuniconnect/shared
```

- Server Components by default; Client Components only when interactivity needed
- All API calls go through `lib/api/` — never raw fetch in components
- Auth state in server session (Next.js cookies), not client-side localStorage

---

## Scalability Notes

- Stateless API (JWT) — horizontally scalable behind a load balancer
- Database connection pooling via PgBouncer or Prisma Accelerate
- File uploads go directly to S3 — API only issues presigned URLs
- Rate limiting on auth endpoints (express-rate-limit or NestJS throttler)
- Redis for refresh token revocation list (phase 2 — noted in TECHNICAL_DEBT.md)
