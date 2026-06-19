# EPIC-004 — Housing & Sublets

## Goal

Verified students can post and browse housing listings: rentals, sublets, flatmate searches, and short-term accommodations. All listings are student-verified.

## Business Rules

1. Only verified students can post housing listings.
2. Housing listing types: `full_apartment`, `room_in_shared_flat`, `sublet`, `short_term`, `flatmate_wanted`.
3. Rent is in EUR per month.
4. A listing must include at least one image (max 15).
5. `available_until` must be after `available_from` if set.
6. Status: `available`, `reserved`, `rented`, `deactivated`. `rented` is terminal.
7. Soft delete only.
8. A verified student may have at most 5 active housing listings.
9. Contact information shown only to verified students.
10. Housing listings visible to all verified students regardless of university.
11. Unauthenticated visitors see listing cards (title, area, price, type) but not contact details or full address.

## Out of Scope (Iteration 1)

- Map view (deferred, VO-004 / Iteration 3)
- Booking / application flow
- Saved / bookmarked listings
- Tenant reviews

---

## Data Model

### `HousingListing`
```
id                  UUID PK
landlord_id         UUID FK → User
type                ENUM('full_apartment','room_in_shared_flat','sublet','short_term','flatmate_wanted')
title               TEXT NOT NULL          -- max 120 chars
description         TEXT NOT NULL          -- max 3000 chars
rent_cents          INTEGER NOT NULL
currency            TEXT NOT NULL DEFAULT 'EUR'
deposit_cents       INTEGER                -- nullable
area_sqm            DECIMAL(6,2)           -- nullable
rooms               DECIMAL(4,1)           -- nullable
city                TEXT NOT NULL
district            TEXT
address_full        TEXT                   -- shown only to verified students
available_from      DATE NOT NULL
available_until     DATE                   -- nullable = open-ended
furnished           BOOLEAN DEFAULT false
pets_allowed        BOOLEAN DEFAULT false
contact_email       TEXT NOT NULL
contact_phone       TEXT                   -- optional; [VO-002 deferred]
status              ENUM('available','reserved','rented','deactivated') DEFAULT 'available'
deleted_at          TIMESTAMPTZ
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### `HousingImage`
```
id              UUID PK
listing_id      UUID FK → HousingListing
s3_key          TEXT NOT NULL
display_order   INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ
```

---

## Use Cases & Specs

### UC-4.1 `CreateHousingListing`
**Error codes:** `HOUSING_LISTING_LIMIT_REACHED`, `INVALID_DATE_RANGE`, `VALIDATION_ERROR`
**Spec file:** `apps/api/src/housing/use-cases/create-housing-listing.use-case.spec.ts`

### UC-4.2 `ListHousingListings`
Filter by type, city, price range, furnished, pets, available_from. Redact address/contact for unauthenticated.
**Spec file:** `apps/api/src/housing/use-cases/list-housing-listings.use-case.spec.ts`

### UC-4.3 `GetHousingListing`
Deactivated listing is not visible to non-owner. Redact contact/address for unauthenticated.
**Spec file:** `apps/api/src/housing/use-cases/get-housing-listing.use-case.spec.ts`

### UC-4.4 `UpdateHousingListing`
Cannot edit a `rented` listing.
**Error codes:** `LISTING_NOT_FOUND`, `FORBIDDEN`, `LISTING_NOT_EDITABLE`
**Spec file:** `apps/api/src/housing/use-cases/update-housing-listing.use-case.spec.ts`

### UC-4.5 `UpdateHousingListingStatus`
Valid transitions: `available↔reserved`, `available/reserved→rented`, `available/reserved→deactivated`, `deactivated→available`. `rented` is terminal.
**Spec file:** `apps/api/src/housing/use-cases/update-housing-listing-status.use-case.spec.ts`

### UC-4.6 `GetMyHousingListings`
**Spec file:** `apps/api/src/housing/use-cases/get-my-housing-listings.use-case.spec.ts`

---

## API Endpoints

| Method | Path | Auth | Use Case |
|--------|------|------|---------|
| POST | `/housing/listings` | Verified | UC-4.1 |
| GET | `/housing/listings` | Optional | UC-4.2 |
| GET | `/housing/listings/:id` | Optional | UC-4.3 |
| PATCH | `/housing/listings/:id` | Owner | UC-4.4 |
| PATCH | `/housing/listings/:id/status` | Owner | UC-4.5 |
| GET | `/housing/my-listings` | Verified | UC-4.6 |

---

## Acceptance Criteria

- [ ] Verified student can create a housing listing with images
- [ ] Unauthenticated user sees listing cards without contact or address details
- [ ] Verified student sees full listing detail including address and contact
- [ ] `availableUntil` before `availableFrom` is rejected
- [ ] Owner can change status through valid transitions
- [ ] `rented` is terminal — no further status changes
- [ ] Owner can edit an `available` or `reserved` listing; cannot edit `rented`
- [ ] Housing listing limit of 5 per user is enforced
- [ ] Deactivated listing not visible to non-owner
- [ ] All unit specs pass
- [ ] All integration specs pass
