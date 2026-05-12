# Community Page — Right Sidebar

## Context
MarketHub — Angular 17 standalone components, Node/Express backend, MongoDB.
Visual reference at `./reference1.png` (use only as layout inspiration, not as exact spec).

## Task
Build the right sidebar of `/community` with three vertical blocks: **Top Communities**, **Hot News**, **Trending Users**.

## Blocks

**Top Communities**
- Show the 3 public communities with the most members
- Card style similar to reference1.png
- Do NOT show online member count, do NOT show info icon
- Backend endpoint if missing: `GET /api/v1/communities/public?sort=members&limit=3`

**Hot News**
- Show the single most recent financial news article
- Before implementing: read `./frontend/src/app/features/markets/market-news` and `./frontend/src/app/features/markets/news-detail` to understand the existing news API integration and reuse it
- Display title + clickable link to open the article

**Trending Users**
- Users who gained the most followers in the past 7 days
- Show top 3
- Backend endpoint if missing: `GET /api/v1/users/trending?period=week&limit=3`

## Constraints
- Angular standalone component for the sidebar, integrated into the existing community page layout
- New backend endpoints only if they don't already exist
- CSS custom properties / existing design tokens, no Bootstrap

## Output format
Only new or modified files.

## IMPORTANT
- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code