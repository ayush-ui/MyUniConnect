# EPIC-003 — Clubs & Communities

## Goal

Verified students can create university clubs, join existing ones, and post within club feeds. Clubs are scoped to a university — a TU Ilmenau student sees TU Ilmenau clubs by default but can browse others.

## Business Rules

1. Only verified students can create or join clubs.
2. A club belongs to one university (the creator's university at time of creation).
3. Club names must be unique within a university.
4. The student who creates a club is automatically its **admin**.
5. A club has a **visibility**: `university_only` (default) or `open` (any verified student from any university can join).
6. Club posts are visible to members only.
7. A student may belong to at most 20 clubs.
8. Club admin can remove members.
9. Club admin can transfer admin role to another member.
10. Leaving a club is always permitted unless the user is the sole admin — in that case, they must transfer admin first or dissolve the club.
11. Dissolving a club soft-deletes it and all its posts.
12. No nested clubs or sub-channels in Iteration 1.

## Out of Scope (Iteration 1)

- Club roles beyond admin / member
- Moderation (flagging posts)
- Event announcements
- Club cover images
- Real-time feed updates (polling on page load)

---

## Data Model

### `Club`
```
id              UUID PK
university_id   UUID FK → University
name            TEXT NOT NULL
description     TEXT NOT NULL        -- max 500 chars
visibility      ENUM('university_only','open') DEFAULT 'university_only'
created_by      UUID FK → User
member_count    INTEGER DEFAULT 1
status          ENUM('active','dissolved') DEFAULT 'active'
deleted_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ

UNIQUE(university_id, name)
```

### `ClubMembership`
```
id          UUID PK
club_id     UUID FK → Club
user_id     UUID FK → User
role        ENUM('admin','member') DEFAULT 'member'
joined_at   TIMESTAMPTZ
left_at     TIMESTAMPTZ            -- null = still a member
```

### `ClubPost`
```
id          UUID PK
club_id     UUID FK → Club
author_id   UUID FK → User
content     TEXT NOT NULL          -- max 5000 chars
deleted_at  TIMESTAMPTZ
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

---

## Use Cases & Specs

### UC-3.1 `CreateClub`
**Input:** `{ name, description, visibility }`
**Error codes:** `CLUB_NAME_TAKEN`, `CLUB_MEMBERSHIP_LIMIT_REACHED`
**Spec file:** `apps/api/src/clubs/use-cases/create-club.use-case.spec.ts`

### UC-3.2 `JoinClub`
**Input:** `{ clubId }`
**Error codes:** `CLUB_NOT_FOUND`, `FORBIDDEN`, `ALREADY_A_MEMBER`, `CLUB_MEMBERSHIP_LIMIT_REACHED`
**Spec file:** `apps/api/src/clubs/use-cases/join-club.use-case.spec.ts`

### UC-3.3 `LeaveClub`
**Input:** `{ clubId }`
**Error codes:** `MEMBERSHIP_NOT_FOUND`, `SOLE_ADMIN_CANNOT_LEAVE`
**Spec file:** `apps/api/src/clubs/use-cases/leave-club.use-case.spec.ts`

### UC-3.4 `DissolveClub`
**Auth:** Club admin only
**Spec file:** `apps/api/src/clubs/use-cases/dissolve-club.use-case.spec.ts`

### UC-3.5 `PostToClub`
**Auth:** Active club member
**Spec file:** `apps/api/src/clubs/use-cases/post-to-club.use-case.spec.ts`

### UC-3.6 `GetClubFeed`
**Auth:** Active club member. Posts ordered newest-first, excludes soft-deleted.
**Spec file:** `apps/api/src/clubs/use-cases/get-club-feed.use-case.spec.ts`

### UC-3.7 `ListClubs`
Returns `open` clubs from all universities + `university_only` clubs matching caller's university. Includes `isMember` flag.
**Spec file:** `apps/api/src/clubs/use-cases/list-clubs.use-case.spec.ts`

### UC-3.8 `RemoveMember`
**Auth:** Club admin. Cannot remove another admin.
**Spec file:** `apps/api/src/clubs/use-cases/remove-member.use-case.spec.ts`

### UC-3.9 `TransferAdminRole`
**Auth:** Club admin. Demotes self to member, promotes target to admin.
**Spec file:** `apps/api/src/clubs/use-cases/transfer-admin.use-case.spec.ts`

---

## API Endpoints

| Method | Path | Auth | Use Case |
|--------|------|------|---------|
| POST | `/clubs` | Verified | UC-3.1 |
| GET | `/clubs` | Verified | UC-3.7 |
| GET | `/clubs/:id` | Verified | Get club detail |
| POST | `/clubs/:id/join` | Verified | UC-3.2 |
| POST | `/clubs/:id/leave` | Member | UC-3.3 |
| DELETE | `/clubs/:id` | Admin | UC-3.4 |
| POST | `/clubs/:id/posts` | Member | UC-3.5 |
| GET | `/clubs/:id/posts` | Member | UC-3.6 |
| DELETE | `/clubs/:id/members/:userId` | Admin | UC-3.8 |
| PATCH | `/clubs/:id/admin` | Admin | UC-3.9 |

---

## Acceptance Criteria

- [ ] Verified student can create a club; becomes its admin
- [ ] Duplicate club name within same university is rejected
- [ ] Student can join an open club from another university
- [ ] Student cannot join a university_only club from a different university
- [ ] Club feed is visible only to members
- [ ] Non-member GET on club feed returns 403
- [ ] Sole admin cannot leave without transferring or dissolving
- [ ] Dissolving a club soft-deletes posts and removes all memberships
- [ ] Admin can remove a non-admin member; cannot remove another admin
- [ ] Membership limit of 20 enforced on join and create
- [ ] All unit specs pass
- [ ] All integration specs pass
