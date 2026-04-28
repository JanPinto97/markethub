# PROMPT — Dev Seed + Topics Verification (optimized)

## Context

- Backend only (`backend/`)
- Node.js seeders (CommonJS)
- MongoDB via existing config (`config/db.js`)
- No data deletion; only additive + idempotent
- No faker; all data is explicit

---

## Task

1. Verify and fix topics seeder (`seed:topics`)
2. Create dev data seeder (`seed:dev`)

---

# 1. Topics Seeder Verification

## Requirements

- Script exists: `npm run seed:topics`
- Seeder file exists (e.g. `backend/seeders/topics.seeder.js`)

## Topics (EXACT match required)

Categories and topics must match exactly (name + slug):

### CORE_MARKETS

Forex, crypto, stocks, indices, etfs, bonds, commodities, metals, energy

### ECONOMIA_I_MACRO

macro-economics, central-banks, interest-rates, inflation, gdp-economic-data, monetary-policy, fiscal-policy, geopolitics, global-economy

### ASSETS_ESPECIFICS

large-cap-stocks, small-cap-penny-stocks, growth-stocks, value-investing, dividend-investing, ipos, spacs, startups-venture-capital, real-estate-reits

### TRADING_I_INVERSIO

day-trading, swing-trading, position-trading, long-term-investing, scalping, algorithmic-trading, quant-trading, high-frequency-trading

Total: 35 topics

## Behavior

- Idempotent (no duplicates by slug)
- Create missing topics only
- Skip existing
- Log created vs existing

---

# 2. Dev Data Seeder

## File

`backend/seeders/dev-data.seeder.js`

## Script

```json
"seed:dev": "node backend/seeders/dev-data.seeder.js"
```

## Global behavior

- Idempotent (check by unique fields)
- No deletes
- Continue on errors (log per block)
- Execution order:
  users → communities → posts → comments
- Final console summary

---

## Data

### Users (8)

- Password: `Test1234!` (bcrypt)
- Fields: username, email, role, bio
- Create if not exists

Users:
alice_trader, bob_crypto, carol_quant, david_value, eve_scalper, frank_macro, grace_whale, henry_analyst

### Followers

- Create bidirectional relations
- Use model structure (IDs arrays)

---

### Public Communities (3)

Gold Bugs, Crypto Alpha, Macro Watch

- Creator NOT auto-member
- Add specified members

---

### Private Communities (2)

Whale Alerts, Quant Lab

- Roles: leader, moderator, little_whale, member
- Assign exact members
- Add pending requests (Whale Alerts: 2 users with messages)

---

### General Posts (15)

- Type: PostX (`origin: 'general'`)
- Use provided dataset
- Distribute `createdAt` over last 7 days (deterministic)
- Add:
  - likes (0–25 random users)
  - comments (first 5 posts: 2–3 each)

---

### Public Community Posts

- 5 posts per community (3 communities)
- `origin: 'public_community'`
- Generate realistic content
- 1 pinned post per community

---

### Private Community Posts

- Whale Alerts: 8 posts (1 pinned)
- Quant Lab: 6 posts
- `origin: 'private_community'`

---

### PostReddit (5)

- Distributed across 3 topics:
  - crypto (2)
  - forex (2)
  - macro-economics (1)

- Include upvotes/downvotes (0–60)
- score = upvotes - downvotes

---

### PostReddit Comments

- First crypto post:
  - 3 comments
  - each with 0–2 replies

---

## Trending Score

Recalculate for all created posts:

```
base = likes + (comments × 2)

<24h   → ×1.0
24–48h → ×0.5
>48h   → ×0.25
```

Update `trendingScore` in DB

---

## Implementation Rules

- Use existing DB connection logic
- Close connection at end
- Use bcrypt hashing
- Deterministic timestamps (no randomness)
- Likes: push userIds directly
- Idempotency:
  - users → username
  - communities → name
  - posts → text + author + origin

- No external libs

---

## Console Output

```
=== DEV SEED COMPLETE ===
Users created: X / 8
Communities public: X / 3
Communities private: X / 2
Posts (general): X / 15
Posts (public comm): X / 15
Posts (private comm): X / 14
PostReddit: X / 5
Comments (PostX): X
Comments (PostReddit): X
Pending requests: X / 2
Followers created: X
trendingScore recalculated: X
=========================
```

---

## Dev Comment Block

Add at top of seeder:

- Test users
- Password
- Community roles
- Pending requests
- Reference admin seed

(Ensure roles match actual data)

---

## Output format

- Return only new or modified files
- Do not repeat unchanged code

---

## IMPORTANT

- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Do not narrate actions
- Return only final code
