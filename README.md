# MyUniConnect

A university-exclusive platform connecting students through a verified marketplace, clubs, and housing listings.

## What It Is

MyUniConnect is accessible only to verified university students. Email verification against known university domains gates all activity — every listing, club post, and housing offer is from a real, verified student.

**Core feature areas:**
1. **Marketplace** — buy/sell items; student-only or public visibility toggle
2. **Clubs & Communities** — create and join university clubs, community boards
3. **Housing & Sublets** — student-posted rental listings, sublets, flatmate searches

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | NestJS (TypeScript) | Modular, testable, DI-first |
| Frontend | Next.js 14 (App Router, TypeScript) | SSR, SEO, web-first, API-ready for mobile later |
| Database | PostgreSQL | Relational integrity, scalable |
| ORM | Prisma | Type-safe queries, migration-first |
| Auth | JWT + Email Verification | Password auth, university email gate |
| File Storage | AWS S3 (or compatible) | Product/listing images |
| Testing | Jest (unit/integration), Playwright (E2E) | TDD from day one |
| Monorepo | pnpm workspaces | Shared types between FE and BE |

## Repository Structure

```
MyUniConnect/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared TypeScript types and constants
├── docs/
│   ├── epics/        # Epic + story definitions
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── TECHNICAL_DEBT.md
├── pnpm-workspace.yaml
└── README.md
```

## Supported Universities

| University | Email Domain | Status |
|------------|-------------|--------|
| TU Ilmenau | @tu-ilmenau.de | Active |

New universities are added via the `universities` seed table — no code change required.

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- PostgreSQL >= 15
- Docker (optional, for local DB)

### Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# Fill in DATABASE_URL, JWT_SECRET, SMTP credentials

pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed

pnpm dev   # starts both api and web in parallel
```

### Running Tests

```bash
pnpm test          # all unit tests
pnpm test:e2e      # Playwright end-to-end
pnpm test:watch    # watch mode
```

## Development Workflow

1. Pick a story from the active epic (see `docs/ROADMAP.md`)
2. Write the spec file first (`*.spec.ts`)
3. Implement to make tests pass
4. Open PR, link the story

See `docs/ARCHITECTURE.md` for clean architecture conventions and layer rules.
