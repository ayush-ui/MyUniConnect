# MyUniConnect — Business & Monetization Model

> Status: Strategy v1 · Owner: Ayush · Last updated: 2026-06-25
>
> This document defines *what the business is*, *who is allowed in*, and *how it
> makes money*. It is the commercial counterpart to `ROADMAP.md` (what we build)
> and `EXECUTION_PLAN.md` (in what order). Engineering decisions should trace back
> to a principle here.

---

## 1. One-line thesis

**A trusted, university-exclusive marketplace and community where every seller is a
verified student — closed enough to be safe, open enough to make the sale.**

The moat is not the marketplace. Anyone can build a marketplace. The moat is
**verified membership of one real-world community**: when you buy a bike on
MyUniConnect, you know the seller is a verified student at your university, you
meet on campus, and you share context. That trust is something eBay,
Kleinanzeigen, and Facebook Marketplace structurally cannot offer.

---

## 2. Access model (decided)

The core insight: **"who can sell" and "who can see" are different axes.** Merging
them is what makes the eBay-vs-walled-garden question feel unanswerable.

> **Update (2026-06-26): account model widened.** We now allow **non-student
> accounts** that can log in and *browse* in-app — but never post. The moat is
> redefined from "who can hold an account" to **"who can post"**. See
> `docs/ARCHITECTURE.md` → "Identity & Account Model (v2)" and
> `docs/mobile/UI_BRIEF-account-types-and-signup.md`.

| Axis | Rule | Rationale |
|------|------|-----------|
| **Who can hold an account** | Any email-verified user: **verified students** *and* **non-students**. | Non-student accounts widen reach (browse) without touching the moat. |
| **Who can create listings** | **Verified students only** (`isVerifiedStudent`). | The moat. Every seller is a real, verified student. Non-students and pending students are blocked (`403`). |
| **Who is a "verified student"** | Student of a **partner university** (auto via matching email domain) **or** an **"Other"** student manually approved by the team. | Auto-path scales; manual "Other" path lets us onboard new campuses one approval at a time. |
| **Default listing visibility** | `students_only`. | The app *feels* like a trusted campus space, not a flea market. |
| **Public reach** | Per-listing opt-in toggle (`students_only` → `public`). | Escape hatch for high-value items (furniture, electronics, bikes) that need a bigger audience. Seller's choice, item by item. |
| **Who can view public listings** | Anyone, no account, via shareable web link; **plus** non-student in-app accounts. | Reach without dilution. Outsiders consume; they never post. |
| **Who can contact a seller** | Students in-app; outsiders via the contact path on the public listing. | Keeps the in-app *posting* experience student-to-student. |

**Why outsiders get view-only and no account:** it gives sellers reach for the
items that need it, while keeping moderation, trust, and safety burdens near zero.
We never have to police a population of anonymous outside buyers inside the app.

**The verified-student badge** is therefore *invisible inside the app* (everyone
has it — it would be noise) and *prominent on public listings* (where it is the
one trust signal an outside buyer cannot get anywhere else): "✓ Verified student,
TU Ilmenau."

---

## 3. Why "attract outside buyers" is right as an escape hatch, wrong as a default

- A student's value and safety come from the **closed community**: campus meetup,
  low risk, shared context.
- If outside buyers become the *norm*, we have rebuilt a generic open marketplace
  — and we lose on liquidity, payments, shipping, and brand to incumbents who do
  that better. **We cannot out-eBay eBay.**
- But for a subset of items (moving-out furniture, electronics, bikes), one campus
  is too small an audience and the sale dies.

**Resolution:** default `students_only`, make `public` a deliberate per-listing
choice. We keep the identity *and* the convenience. This is already supported by
the existing `visibility` field on listings — the strategy and the schema agree.

---

## 4. Go-to-market: density before breadth

A marketplace is a two-sided liquidity problem. **50 active students at one
university beats 5,000 spread across the country.** Strategy is therefore:

1. **Win one campus completely — TU Ilmenau** (already the only enabled domain).
2. Only after proven liquidity + retention at campus #1, templatize and add the
   next university (the `universities` table already makes this a data change, not
   a code change).

Liquidity milestone to define before expanding: e.g. *"N listings/week, M active
buyers/week, X% of listings result in a contact within 7 days."* Set real numbers
once the first cohort is live.

---

## 5. Revenue model — phased

**Guiding rule: density first, monetization second. Never a per-sale fee on
students.** A transaction tax at this stage kills the supply side. Money comes from
parties who benefit from access to a concentrated, verified student audience —
not from the students' own peer-to-peer trades.

### Phase A — Launch (0 → first active cohort): **No monetization**
- Goal is liquidity and retention, nothing else.
- Free for all students, no fees, no ads. Anything that adds friction to listing
  or buying is the enemy.

### Phase B — Early traction (one campus liquid): **Light, non-extractive revenue**
- **Featured / bumped listings** — student pays a small fee to pin or re-surface a
  listing. Optional, never required; pure convenience.
- **Local business & service partnerships** — cafés, gyms, bookstores, language
  schools, student housing agencies pay to reach a verified single-campus
  audience. High intent, hyper-local, something Instagram ads can't target as
  cleanly. This is the most defensible early revenue.

### Phase C — Feature depth (Housing & Clubs live): **Vertical monetization**
- **Housing is the strongest paid vertical.** Landlords and letting agencies pay
  to list or to promote sublets/rooms to verified students. Students list/search
  for free; the paying side is the supply of housing.
- **Premium student tier (optional)** — higher listing limits, advanced filters,
  saved searches/alerts, priority placement. Must remain genuinely optional; the
  free tier stays fully usable.

### Phase D — Scale (multi-campus): **Aggregate audience products**
- University-level sponsorships, orientation-week partnerships, brand campaigns
  targeting the verified-student network across campuses.
- Anonymized, aggregated market insights (never individual data).

**What we explicitly will NOT do:** per-transaction commissions on student↔student
sales, selling personal data, or letting paid placement override trust signals.

---

## 6. Retention: marketplace acquires, community retains

Marketplace alone is **transactional** — a student sells their couch and leaves.
The reason to build Housing and Clubs (already next on the roadmap) is retention:

- **Housing** — recurring, high-stakes student need (sublets, rooms, roommates).
  Strong pull *and* the best monetization surface (paying landlord side).
- **Clubs** — weekly habit loop; the reason to open the app when you have nothing
  to buy or sell.

The commercial sequencing therefore matches the engineering roadmap: Marketplace
(live) → Housing → Clubs.

---

## 7. Launch blockers (must clear before any real user)

These are commercial blockers, not just tech debt — without them there is no
business to monetize:

| Blocker | Why it blocks the business | Ref |
|---------|---------------------------|-----|
| Email verification in test mode | Real `@tu-ilmenau.de` signups are rejected → **literally no one can join** | DEBT-011 |
| "Contact seller" is a mailto stub | Marketplaces live or die on the buyer↔seller connection; fine for v1, urgent right after | DEBT-004 |
| Public listing web view | Required to deliver the "outsiders view-only" half of the access model | (new) |

---

## 8. Key metrics to instrument

- **Supply:** new listings/week, active listings, listings per active seller.
- **Demand:** weekly active buyers, listing→contact rate, time-to-first-contact.
- **Liquidity:** % of listings that get a contact within 7 days; % marked sold.
- **Retention:** week-1 / week-4 return rate (the number Clubs/Housing must move).
- **Public-reach usage:** % of listings opted into `public`, views via web link.
  (Tells us whether the escape hatch is actually needed and how much.)

---

## 9. Open decisions (revisit as data arrives)

1. Concrete liquidity threshold that gates expansion to campus #2.
2. Whether the contact path on public listings is email-relay, a web reply form,
   or a "download the app to contact" prompt (trade-off: outsider convenience vs.
   funneling demand into the app).
3. Pricing for featured listings and local-business partnerships (set after we
   know audience size at TU Ilmenau).
4. Whether Housing's paying side is self-serve (landlords pay in-app) or
   sales-led (we onboard agencies manually first).
