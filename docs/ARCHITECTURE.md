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
  → hash password with bcryptjs (12 rounds)
  → create unverified user
  → generate random 32-byte hex token; store SHA-256(token) in DB (24h TTL)
  → send verification email with raw token (fire-and-forget via ResendEmailService)

GET /auth/verify-email?token=...
  → SHA-256(token) → findUnusedByHash (usedAt IS NULL AND expiresAt > now)
  → mark token used, mark user emailVerified=true

POST /auth/resend-verification
  → find user by email; no-op for unknown / deleted / already-verified accounts
  → invalidate outstanding tokens, issue a fresh one, resend email
  → always returns a generic message (no email enumeration)

POST /auth/login
  → check user exists + is verified
  → check password (bcryptjs)
  → return access token (15m) + refresh token (7d, httpOnly cookie)

POST /auth/refresh
  → validate refresh token (SHA-256 hash lookup, same pattern as email token)
  → return new access token, rotate refresh token
```

> **Token hashing rule**: Use `crypto.createHash('sha256')` for all stored tokens
> (verification, refresh). Never use bcrypt for tokens — bcrypt salts make it
> non-deterministic, so you cannot look up a token by its value. bcrypt is only
> for passwords.

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
- Test DB (`postgres_test`) runs in Docker on port 5433; dev DB uses 5432
- `jest.integration.config.ts` runs `*.integration.spec.ts` with `--runInBand`
- `test/integration/global-setup.ts` runs `prisma migrate deploy` + `prisma db seed` before the suite
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

## Mobile Architecture (React Native / Expo)

> Full conventions in `docs/mobile/MOBILE_ARCHITECTURE.md`.

```
app/
  _layout.tsx            # Root layout — AuthProvider lives here
  index.tsx              # Auth gate → redirects to (auth) or (tabs)
  (auth)/                # Unauthenticated route group
  (tabs)/                # Authenticated route group (guarded in _layout.tsx)
components/
  ui/                    # Primitive components only (Button, FormField, …)
context/
  AuthContext.tsx        # Single source of truth for auth state
lib/
  api/
    client.ts            # Base fetch wrapper with Bearer + Cookie injection
    auth.ts              # Typed methods for every auth endpoint
  auth/
    storage.ts           # expo-secure-store abstraction
```

### Key Mobile Decisions

**Cookie workaround:** The API issues refresh tokens as httpOnly cookies (browser-safe). React Native's `fetch` does not manage cookies automatically. Solution: parse `Set-Cookie` response headers after login/refresh, store the raw token in `expo-secure-store`, inject it as a `Cookie:` header on refresh/logout requests.

**Token lifecycle:** Access tokens are stored in `expo-secure-store`. A refresh timer fires 2 minutes before the 15-minute access token expiry, rotating both tokens transparently.

**No external state library:** Auth state lives in a single React Context (`AuthContext`). Feature state lives in local component state or feature-scoped hooks. We do not add Redux, Zustand, or Jotai until a concrete cross-feature state need is proven.

---

## Scalability Notes

- Stateless API (JWT) — horizontally scalable behind a load balancer
- Database connection pooling via PgBouncer or Prisma Accelerate
- File uploads go directly to S3 — API only issues presigned URLs
- Rate limiting on auth endpoints (express-rate-limit or NestJS throttler)
- Redis for refresh token revocation list (phase 2 — noted in TECHNICAL_DEBT.md)
