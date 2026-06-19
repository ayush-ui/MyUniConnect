# Technical Debt Register

Items here are known shortcuts or deferred improvements. Each entry has a label:

- `[DEBT]` — shortcut taken knowingly, must revisit
- `[VO]` — value object deferred
- `[INFRA]` — infrastructure improvement deferred
- `[ORPHAN]` — file/module flagged as potentially abandoned

---

## Value Objects — Deferred

| ID | VO | Reason Deferred | When to Revisit |
|----|-----|----------------|-----------------|
| VO-001 | `Price` / Money | Single currency (EUR) for now | Before multi-currency or payment integration |
| VO-002 | `PhoneNumber` | No phone features in Iteration 1 | Before SMS verification added |
| VO-003 | `Slug` | Auto-generated IDs used for URLs now | Before SEO-friendly URL routing needed |
| VO-004 | `Address` | Free-text location field for now | Before map view in housing (Iteration 3) |
| VO-005 | `Username` | No username system yet | Before public profiles launched |

---

## Infrastructure — Deferred

| ID | Item | Reason Deferred | When to Revisit |
|----|------|----------------|-----------------|
| INFRA-001 | Redis for refresh token revocation | File-based / DB revocation OK for MVP | Before scale-out (Iteration 3) |
| INFRA-002 | PgBouncer / connection pooling | Low traffic in early stage | Before load testing in Iteration 3 |
| INFRA-003 | CDN (CloudFront) for S3 images | Direct S3 URLs in dev | Before Iteration 2 goes to production |
| INFRA-004 | Full-text search (tsvector or Meilisearch) | ILIKE search fine for MVP | When listing count > 1000 |
| INFRA-005 | Rate limiting persistence (Redis) | In-memory throttler for now | Before production hardening |
| INFRA-006 | Email queue (Bull/BullMQ) | Direct SMTP send for now | If email delivery reliability becomes issue |

---

## Known Shortcuts

| ID | Location | Description | Fix When |
|----|---------|-------------|---------|
| DEBT-001 | Auth | Refresh tokens stored in DB, no revocation list | Before Iteration 3 (INFRA-001) |
| DEBT-002 | Images | No image resizing / thumbnail generation | Before mobile launch |
| DEBT-003 | Search | Listing search is simple ILIKE — no ranking | INFRA-004 |
| DEBT-004 | Messaging | "Contact seller" is a stub (mailto link) | Iteration 2 full messaging epic |
| DEBT-005 | Notifications | No real-time — polling only on initial build | Iteration 2 notification epic |
| DEBT-006 | Email | StubEmailService logs to console; no real SMTP | Before any production deployment |
| DEBT-007 | Auth | `ITokenService.signRefreshToken` accepts a `TokenPayload` param that is currently unused (tokens are opaque random bytes) | Clean up interface in Iteration 2 — remove param or replace with a dedicated `generateRefreshToken(): string` method |

---

## Orphan Watch List

Files flagged for review. If still unused after the next epic completes, delete them.

| File | Flagged On | Review By | Status |
|------|-----------|-----------|--------|
| _(none yet)_ | | | |

---

## Review Cadence

This file is reviewed at the start of each epic planning session.
Any `[ORPHAN]` item older than 2 epics is deleted without further discussion.
