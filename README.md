# UniSync

> Product name: **UniSync**. The repository directory and some internal identifiers still read "MyUniConnect" (legacy) — tracked as DEBT-021. Brand kit: `apps/mobile/assets/brand/`.

A university platform connecting students through a verified marketplace, clubs, and housing listings. **Verified students** can post; **non-students** can hold browse-only accounts. The trust moat is "who can post," not "who can hold an account" (see `docs/BUSINESS_MODEL.md`).

**Core areas:** Marketplace (buy/sell) · Clubs & Communities · Housing & Sublets

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS (TypeScript), Clean Architecture |
| Mobile | React Native + Expo (TypeScript), NativeWind |
| Database | PostgreSQL 15 + Prisma ORM |
| Auth | JWT (15m access) + opaque refresh tokens (7d, rotated) |
| File storage | AWS S3 (presigned URLs) |
| Testing | Jest (unit + integration), Playwright (E2E) |
| Monorepo | pnpm workspaces |

---

## Repository Structure

```
MyUniConnect/
├── apps/
│   ├── api/          # NestJS backend
│   └── mobile/       # Expo / React Native app (the frontend)
├── packages/
│   └── shared/       # Shared TypeScript types
├── docs/
│   ├── epics/        # Epic + story definitions
│   ├── mobile/       # Mobile-specific architecture docs
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── TECHNICAL_DEBT.md
├── docker-compose.yml
└── README.md
```

---

## Supported Universities

| University | Email Domain | Status |
|------------|-------------|--------|
| TU Ilmenau | @tu-ilmenau.de | Active |

New universities are added via the `universities` DB table — no code change required.

---

## Local Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 |
| pnpm | >= 9 |
| Docker | Any recent version |
| Expo Go | Latest (iOS or Android) — for physical device testing |

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the database

```bash
docker compose up -d
```

This starts two Postgres containers:
- `postgres` on port `5432` — development database
- `postgres_test` on port `5433` — integration test database

### 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

The defaults in `.env.example` work with the Docker setup. You only need to change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` if you care about token security in local dev.

Key variables:

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://myuniconnect:myuniconnect@localhost:5432/myuniconnect` | Matches Docker Compose |
| `JWT_ACCESS_SECRET` | `change-me-access-secret` | Change in production |
| `JWT_REFRESH_SECRET` | `change-me-refresh-secret` | Change in production |
| `PORT` | `3001` | API listens here |
| `APP_URL` | `http://localhost:3000` | Used in verification email links |

### 4. Run database migrations and seed

```bash
pnpm --filter api db:migrate   # runs prisma migrate dev
pnpm --filter api db:seed      # seeds the universities table
```

### 5. Start the API

```bash
pnpm dev        # starts the NestJS API on http://localhost:3001
```

Swagger UI is available at `http://localhost:3001/docs`.

---

## Running the Mobile App

### 1. Configure the mobile app

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

Edit `apps/mobile/.env.local`:

```env
# Use your machine's LAN IP when testing on a physical device or Android emulator.
# Use http://localhost:3001 for iOS Simulator on the same machine.
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3001
```

To find your LAN IP:
- macOS: `ipconfig getifaddr en0`
- Linux: `ip route get 1 | awk '{print $7}'`

### 2. Start the Expo dev server

```bash
pnpm dev:mobile
```

Then:
- **iOS Simulator** — press `i` in the terminal
- **Android Emulator** — press `a`
- **Physical device** — scan the QR code with the Expo Go app

> The API must be running (`pnpm dev`) before the mobile app can make requests.

---

## Running Tests

### API unit tests

```bash
pnpm test
# or watch mode:
pnpm --filter api test -- --watch
```

### API integration tests (requires both Docker DBs running)

```bash
pnpm --filter api test:integration
```

Integration tests run against `postgres_test` on port 5433. The global setup runs `prisma migrate deploy` + seed automatically.

### Mobile tests

```bash
pnpm --filter mobile test
```

Mobile tests cover pure utilities, hooks, and the AuthContext state machine. They do not test screen rendering.

---

## Development Workflow

1. Pick a story from `docs/ROADMAP.md`
2. For backend: write the spec file first (`*.spec.ts`) — see `docs/ARCHITECTURE.md`
3. For mobile: write tests for hooks/utils first — see `docs/mobile/MOBILE_ARCHITECTURE.md`
4. Implement to make tests pass
5. Open a PR referencing the story number

### Email verification in development

The API uses `StubEmailService` in development. Verification tokens are **logged to the API console** — watch the terminal where `pnpm dev` is running:

```
[STUB] Verification email → student@tu-ilmenau.de
[STUB] Link: http://localhost:3000/verify-email?token=abc123...
```

Copy the token from the log and use it manually to verify an account.

---

## Architecture Docs

| Document | What it covers |
|----------|---------------|
| `docs/ARCHITECTURE.md` | Layer rules for backend and mobile, auth flow, error conventions |
| `docs/mobile/MOBILE_ARCHITECTURE.md` | Mobile-specific rules: screens, hooks, API layer, styling, testing |
| `docs/ROADMAP.md` | Story status, iteration goals, execution order |
| `docs/TECHNICAL_DEBT.md` | Known shortcuts with revisit conditions |
| `docs/epics/EPIC-001-AUTH.md` | Auth data model, use case specs, API contract |
