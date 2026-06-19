# EPIC-002 — Marketplace (Buy & Sell)

## Goal

Verified students can list second-hand items for sale. Each listing can be student-only (visible only to verified users) or public (visible to everyone). Buyers contact sellers via the platform.

## Business Rules

1. Only verified students can create, edit, or deactivate listings.
2. A listing has a **visibility** flag: `students_only` or `public`.
   - `students_only`: visible only to authenticated, verified users.
   - `public`: visible to everyone including unauthenticated visitors.
3. A listing must have at least one image.
4. Maximum 10 images per listing.
5. Listing price is in EUR, minimum €0 (free items allowed), maximum €9,999.
6. A listing has a status: `active`, `reserved`, `sold`, `deactivated`.
7. Only the listing owner can change status or edit the listing.
8. Soft delete only — listings are never hard-deleted.
9. A user may have at most 20 active listings at a time (to prevent spam).
10. Categories are predefined (seeded) — users select from a list, no free-text categories.
11. Search is available to all (respecting visibility filter for unauthenticated users).
12. Images are uploaded directly to S3 via presigned URLs — the API never handles the binary.

## Out of Scope (Iteration 1)

- In-app messaging (contact is via email stub — seller's email shown to verified users only)
- Payment processing
- Offer / negotiation flow
- Reporting / flagging
- Saved / bookmarked listings
- Seller ratings / reviews

---

## Data Model

### `Category`
```
id          UUID PK
name        TEXT NOT NULL UNIQUE    -- e.g. "Electronics", "Books", "Furniture"
slug        TEXT NOT NULL UNIQUE
created_at  TIMESTAMPTZ
```

### `MarketplaceListing`
```
id              UUID PK
seller_id       UUID FK → User
category_id     UUID FK → Category
title           TEXT NOT NULL           -- max 100 chars
description     TEXT NOT NULL           -- max 2000 chars
price_cents     INTEGER NOT NULL        -- stored as cents; 0 = free
currency        TEXT NOT NULL DEFAULT 'EUR'
condition       ENUM('new','like_new','good','fair','poor')
visibility      ENUM('students_only','public') DEFAULT 'students_only'
status          ENUM('active','reserved','sold','deactivated') DEFAULT 'active'
location        TEXT                    -- free-text city/area; [VO-004 deferred]
deleted_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### `ListingImage`
```
id              UUID PK
listing_id      UUID FK → MarketplaceListing
s3_key          TEXT NOT NULL
display_order   INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ
```

---

## Value Objects

| VO | Status | Notes |
|----|--------|-------|
| `Price` (Money) | **Deferred** (VO-001) | Stored as integer cents; no VO until multi-currency |
| `ListingTitle` | **Not a VO** | Max-length validated via Zod at presentation layer |

---

## Use Cases & Specs

### UC-2.1 `CreateListing`

**Auth:** Verified student required

**Input:**
```typescript
{
  title: string          // 3–100 chars
  description: string    // 10–2000 chars
  priceCents: number     // 0–999900
  currency: 'EUR'
  categoryId: string     // UUID
  condition: Condition
  visibility: Visibility
  location?: string      // max 100 chars
  imageKeys: string[]    // 1–10 S3 keys (uploaded before this call)
}
```

**Flow:**
1. Verify caller is a verified student.
2. Validate all fields (Zod schema).
3. Check caller has fewer than 20 active listings → throw `LISTING_LIMIT_REACHED`.
4. Verify `categoryId` exists.
5. Verify each `imageKey` belongs to the caller's pending uploads (prevent key hijacking).
6. Create `MarketplaceListing` record with `status = 'active'`.
7. Create `ListingImage` records.
8. Return created listing DTO.

**Error codes:**
- `LISTING_LIMIT_REACHED`
- `CATEGORY_NOT_FOUND`
- `INVALID_IMAGE_KEY`
- `VALIDATION_ERROR`

**Spec file:** `apps/api/src/marketplace/use-cases/create-listing.use-case.spec.ts`

---

### UC-2.2 `GetPresignedUploadUrl`

**Auth:** Verified student required

**Input:** `{ fileName: string, contentType: string }`

**Flow:**
1. Validate `contentType` is one of `image/jpeg`, `image/png`, `image/webp`.
2. Generate S3 key: `uploads/{userId}/{uuid}.{ext}`
3. Generate presigned PUT URL (5 minute expiry).
4. Return `{ uploadUrl, s3Key }`.

**Spec file:** `apps/api/src/marketplace/use-cases/get-presigned-upload-url.use-case.spec.ts`

---

### UC-2.3 `ListListings`

**Auth:** None (public listings shown to all; students_only listings shown only to verified users)

**Input:**
```typescript
{
  categoryId?: string
  condition?: Condition
  minPriceCents?: number
  maxPriceCents?: number
  search?: string        // searches title + description
  page?: number          // default 1
  pageSize?: number      // default 20, max 50
  sortBy?: 'newest' | 'price_asc' | 'price_desc'
}
```

**Flow:**
1. If caller is unauthenticated or unverified: add `visibility = 'public'` filter.
2. Always filter `status = 'active'` and `deleted_at IS NULL`.
3. Build query with filters.
4. Return `{ data: ListingDTO[], total, page, pageSize }`.

**Spec file:** `apps/api/src/marketplace/use-cases/list-listings.use-case.spec.ts`

---

### UC-2.4 `GetListing`

**Auth:** None for public; verified student for students_only

**Flow:**
1. Fetch listing by ID where `deleted_at IS NULL`.
2. If `visibility = 'students_only'` and caller is not a verified student → throw `FORBIDDEN`.
3. Return full listing DTO including images and seller's first name + university.

**Error codes:** `LISTING_NOT_FOUND`, `FORBIDDEN`

**Spec file:** `apps/api/src/marketplace/use-cases/get-listing.use-case.spec.ts`

---

### UC-2.5 `UpdateListing`

**Auth:** Verified student, must be listing owner

**Flow:**
1. Fetch listing. Verify ownership.
2. Verify listing is not `sold` or `deactivated` → throw `LISTING_NOT_EDITABLE`.
3. Update fields. Return updated listing DTO.

**Error codes:** `LISTING_NOT_FOUND`, `FORBIDDEN`, `LISTING_NOT_EDITABLE`

**Spec file:** `apps/api/src/marketplace/use-cases/update-listing.use-case.spec.ts`

---

### UC-2.6 `UpdateListingStatus`

**Auth:** Verified student, must be listing owner

**Valid transitions:**
- `active` → `reserved`, `sold`, `deactivated`
- `reserved` → `active`, `sold`, `deactivated`
- `sold` → nothing (terminal)
- `deactivated` → `active`

**Spec file:** `apps/api/src/marketplace/use-cases/update-listing-status.use-case.spec.ts`

---

### UC-2.7 `GetMyListings`

**Auth:** Verified student

**Spec file:** `apps/api/src/marketplace/use-cases/get-my-listings.use-case.spec.ts`

---

## API Endpoints

| Method | Path | Auth | Use Case |
|--------|------|------|---------|
| POST | `/marketplace/listings` | Verified | UC-2.1 |
| POST | `/marketplace/upload-url` | Verified | UC-2.2 |
| GET | `/marketplace/listings` | Optional | UC-2.3 |
| GET | `/marketplace/listings/:id` | Optional | UC-2.4 |
| PATCH | `/marketplace/listings/:id` | Owner | UC-2.5 |
| PATCH | `/marketplace/listings/:id/status` | Owner | UC-2.6 |
| GET | `/marketplace/my-listings` | Verified | UC-2.7 |

---

## Seed Data — Categories

```
Electronics, Books & Study Materials, Furniture, Clothing & Accessories,
Sports & Fitness, Musical Instruments, Kitchen & Household, Bicycles,
Gaming, Other
```

---

## Acceptance Criteria

- [ ] Verified student can create a listing with images
- [ ] Unverified user gets 401 trying to create a listing
- [ ] Public listing visible to guest users; students_only listing returns 403 for guests
- [ ] Listing search works by title keyword
- [ ] Listing filter by category, condition, price range works
- [ ] Owner can edit listing content
- [ ] Owner can change status through valid transitions
- [ ] Invalid status transitions are rejected with clear error
- [ ] User cannot create more than 20 active listings
- [ ] All unit specs pass
- [ ] All integration specs pass
