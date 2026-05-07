# MarketHub — Full Context (for new Claude sessions)

> This document is the official context prompt for the project. It contains
> everything you need to start working from minute one: stack, decisions,
> business rules, models, endpoints, components, routes, conventions and
> real status. If you enter a new session, read this file before touching
> anything.

---

## 1. What MarketHub is

A financial web portal + social network. Users share market analysis,
follow the economic calendar and interact in communities (Twitter/X-style
and Reddit-style discussions).

- **Frontend:** Angular 21 (standalone components + signals), TypeScript 5.9 strict, custom CSS with variables, Tailwind via CDN as complement.
- **Backend:** Node 20 + Express 5, MongoDB 7 + Mongoose 9, JWT (access in memory, refresh in httpOnly cookie).
- **Infrastructure:** Docker + docker-compose (mongo + backend + frontend).
- **External APIs (Markets):** Finnhub, Twelve Data, CoinGecko, TradingView widgets.

---

## 2. Repo structure

```
markethub/
├── CLAUDE.md                  → summarised context + phase status (rules)
├── COMMUNITY.md               → full functional spec of the Community page
├── README.md                  → public summary + routes + status
├── context.md                 → THIS FILE
├── context1.txt, context2.md  → historical context (do not edit)
├── docker-compose.yml         → mongo + backend + frontend
├── .env / .env.example        → environment variables (root)
├── frontend/                  → Angular SPA (port 4200)
│   ├── CLAUDE.md
│   ├── src/app/
│   │   ├── core/{guards,interceptors,services,models}
│   │   ├── features/{home,markets,community,search,profile,auth,settings}
│   │   └── shared/{components,pipes,utils}
│   └── src/styles/{variables.css, reset.css}
└── backend/                   → Express API (port 3000)
    ├── CLAUDE.md
    ├── server.js
    ├── config/{db.js, upload.js}
    ├── models/  controllers/  routes/  middleware/
    └── uploads/{images,videos}  → served at /uploads/* (gitignored)
```

---

## 3. Stack decisions (do not change)

- **Angular 21 standalone components**, signals for state whenever possible, lazy-loaded routes via `loadComponent`.
- **Custom CSS + variables** in `frontend/src/styles/variables.css` is the default. Tailwind via CDN is allowed but as a complement, not a replacement. **No Bootstrap.**
- **Strict Express MVC**: `models/`, `controllers/`, `routes/`, `middleware/`. Async/await everywhere, errors via `next(err)`.
- **Auth:** JWT access token in memory (never in localStorage), refresh token in httpOnly cookie. Automatic refresh in the interceptor.
- **Endpoints:** all prefixed with `/api/v1`.
- **Response format:** success `{ success: true, ... }` / error `{ success: false, message, code }`.
- **TypeScript strict mode** mandatory on the frontend.
- **File upload:** `multer` (backend). Images max 10MB (jpeg/png/gif/webp). Videos max 100MB (mp4/webm/quicktime). Served statically from `/uploads/images/` and `/uploads/videos/`.
- **User avatars:** for now via text URL, no upload (except community covers).

---

## 4. Environment and how to run

```bash
# Docker (recommended)
docker-compose up --build
# → frontend http://localhost:4200, backend http://localhost:3000, mongo localhost:27017 (db: markethub)

# Local
cd backend && npm run dev    # nodemon, requires Mongo on localhost:27017
cd frontend && ng serve      # port 4200
```

Inside Docker the backend connects to `mongodb://mongo:27017/markethub`.
The backend loads `.env` from the project root via `dotenv`.

---

## 5. Role system

### Platform roles (`User.role`)
- `user` — default on registration.
- `moderator` — can delete any post/comment across the platform.
- `superadmin` — moderator powers + can delete users.

`moderator` and `superadmin` are only created via seed (`npm run seed`). Never via UI.

### Private community roles (`CommunityPrivate.members[].role`)
- `leader` — exactly 1 per community. Maximum power within the community.
- `moderator` — multiple. Accepts requests, deletes posts.
- `little_whale` — multiple. Feed-ranking bonus.
- `member` — default on joining.

**IMPORTANT:** platform roles and community roles are completely independent. Never mix them.

### Leader succession when leaving
1. Random moderator → leader.
2. If none, random Little Whale → leader.
3. If none, random member → leader.
4. If the community is empty → automatically deleted.

---

## 6. Post types

### PostX (Twitter/X-style)
- Used in: general feed, public communities, private communities.
- Fields: `text` (max 400), `mediaUrl`, `mediaType`, `origin` (`general`|`public_community`|`private_community`), `community`, `communityType`, `likes`, `commentCount`, `trendingScore`, `isPinned`.
- Likes (toggle). Comments with 1 nesting level. Likes on comments.

### PostReddit (Reddit-style)
- **Exclusively** in discussion topics (`/community/t/:slug`).
- Fields: `title` (max 300), `text` (max 2000), `mediaUrl`, `mediaType`, `upvotes`, `downvotes`, `topic`.
- Score = `upvotes - downvotes`. Voting the opposite removes the previous vote.
- Comments with 1 nesting level. **No likes on comments.**

**Fundamental rule:** PostX and PostReddit NEVER mix in any feed, search or profile.

---

## 7. General feed (`/community`)

### Trending (default, public)
- PostX with `origin: 'general'` + `origin: 'public_community'` mixed.
- Posts from public communities show a badge with the community name.
- NEVER shows `private_community`.
- Order: `trendingScore` desc.

### Following (login required)
- PostX from followed users, only `general` + `public_community`.
- Never `private_community` (even if you follow the author).
- Order: `createdAt` desc.

### Trending score algorithm
```
baseScore = (likes × 1) + (commentCount × 2)
age < 24h  → score = baseScore × 1.0
age 24-48h → score = baseScore × 0.5
age > 48h  → score = baseScore × 0.25
```
A job recalculates every 30 minutes via `setInterval` in `server.js`.

---

## 8. Communities

### Public
- Any authed user joins without approval. No roles.
- No internal moderation (only the author and platform mods/superadmins can delete posts).
- Their posts appear in Trending with a badge.
- When the last member leaves → silently auto-deleted.
- **Cannot** be converted to private.
- The creator has NO special role and is **not** auto-added.

### Private
- Join requests (max 150 chars). Acceptance by leader/moderator.
- Feed: pinned posts on top, then ordered by `trendingScore` + role bonus (computed at query time, not persisted):
  - leader +50, moderator +20, little_whale +10, member +0.
- Private posts **never** appear in the general feed or in the public profile.
- Details page (`/community/p/:id/details`):
  - All members: list + leave button.
  - Leader/moderator: pending requests (click → modal with full message + Accept/Reject).
  - Leader: expel, promote, delete community.

### Discover (`GET /api/v1/communities/discover`)
- Filters: `?search`, `?sort=popularity|members|new`, `?type=public,private`, `?page`, `?limit`.
- `popularity` = joins in the last 7 days.
- `optionalAuth` — authed user sees `isJoined`.
- UI: `DiscoverCommunitiesPopupComponent` popup (sidebar `+ Discover Communities`). Full-screen on mobile.

---

## 9. Discussion topics

Hardcoded via seed. **Not** edited via UI.

**Categories:**
- `CORE_MARKETS`: Forex, Crypto, Stocks, Indices, ETFs, Bonds, Commodities, Metals, Energy.
- `ECONOMIA_I_MACRO`: Macro Economics, Central Banks, Interest Rates, Inflation, GDP & Economic Data, Monetary Policy, Fiscal Policy, Geopolitics, Global Economy.
- `ASSETS_ESPECIFICS`: Large Cap, Small Cap & Penny, Growth, Value, Dividend, IPOs, SPACs, Startups & VC, Real Estate & REITs.
- `TRADING_I_INVERSIO`: Day, Swing, Position, Long-term, Scalping, Algorithmic, Quant, HFT.

Topics **do not** appear in general search — they have their own popup (`TopicSearchPopupComponent`) accessible from the sidebar (`+ Add Topics`), with category filter and pin/unpin to the sidebar (persisted in `localStorage`).

---

## 10. Profile and search

### Public profile (`/profile/:username`)
Avatar, coverImage, username, followers/following count + modal, bio, public communities, public posts.
**Public posts** = PostX with `origin: 'general'` or `origin: 'public_community'`. Never private. Never PostReddit.

### Settings (`/settings`, authGuard)
Three independent sections (Profile / Account / Password) each with its own Reactive Form and save action. Frontend validation before calling the API. 409/401/400 inline. Success auto-hides after 4s.

### General search (`/search`)
- Covers: users, public PostX, public and private communities (name + description, never internal content).
- **Does NOT** cover PostReddit or topics (they have their own popup).
- Type filters: `users`, `posts`, `communities`, or `all` (top 3 per category).
- Page with its own dynamic input (debounced 350ms, navigates via `replaceUrl: true`). No reload.

---

## 11. Discussions (chat from comment)

- 1-to-1 thread linked to a PostX comment. Created when the first message is sent.
- Routes: `/community/discussion/new/:commentId` (new mode) and `/community/discussion/:discussionId` (existing). authGuard.
- Models: `Discussion` (linked to comment + createdBy) and `DiscussionMessage` (supports `replyTo`).
- Message list with cursor pagination.
- UI: chat-style with auto-resize, scroll-to-bottom, "replying to" label.

---

## 12. Markets (Phase 4, in progress)

- Live tickers: Finnhub (US stocks), Twelve Data (forex/crypto/gold), CoinGecko (global crypto).
- TradingView widget for charts.
- WebSocket for real-time updates.
- `EconomicCalendarComponent` under Markets, events table with impact/country/event/forecast/actual.
- Endpoint: `GET /api/v1/markets/*` (proxy/aggregator).

---

## 13. Backend structure

### Models (`/backend/models/`)
- `User` — username, email, passwordHash, role, avatar, coverImage, bio, following, followers, loginAttempts, lockUntil, createdAt. `toPublicJSON()` omits email; `toPrivateJSON()` includes it.
- `PostX`, `PostReddit`, `Comment` (shared, 1 level, likes only on PostX).
- `CommunityPublic` (no roles, auto-delete).
- `CommunityPrivate` (roles, requests, auto-delete, succession).
- `DiscussionTopic` (fixed via seed).
- `Discussion`, `DiscussionMessage`.

### Relevant endpoints (all under `/api/v1`)

**Auth:** `POST register|login|logout|refresh`, `GET me` (protected).
**Profile:** `PUT /profile` (username, email, avatar, coverImage, bio), `PUT /profile/password`.
**Posts (PostX):** `POST /posts`, `GET /posts/feed?mode=trending|following`, `GET /posts/:id`, `POST /posts/:id/like`, `DELETE /posts/:id`, comments and replies with likes (`POST .../comments`, `POST .../comments/:id/like`, `POST .../comments/:id/reply`, `POST .../replies/:rid/like`, `DELETE`).
**Public communities:** CRUD + `POST :id/join|leave`, `GET :id/feed`, `POST :id/posts`.
**Private communities:** CRUD + `POST :id/request`, `POST :id/requests/:rid` (accept/reject), `DELETE :id/members/:uid`, `PUT :id/members/:uid/role`, `POST :id/leave`, `DELETE :id`, `GET/POST :id/feed|posts`, `POST :id/posts/:pid/pin`.
**My / Discover:** `GET /communities/my`, `GET /communities/discover` (search/sort/type/page/limit, optionalAuth).
**Topics + PostReddit:** `GET /topics`, `GET /topics/:slug`, `GET /topics/:slug/feed?sort=recent|top`, `POST /topics/:slug/posts`, `POST .../vote {vote: up|down|none}`, `DELETE`, comments and replies (no likes).
**Users:** `GET /users/:username`, `GET /users/:username/posts|followers|following`, `POST /users/:username/follow` (toggle).
**Search:** `GET /search?q&type&page&limit`.
**Discussions:** `GET/POST /discussions/comment/:commentId`, `GET /discussions/:id`, `GET/POST /discussions/:id/messages` (cursor).
**Markets:** `GET /markets/*` (Finnhub / Twelve Data / CoinGecko / calendar).

### Infra
- Multer in `config/upload.js`. `/uploads/images/`, `/uploads/videos/` served statically.
- Trending job every 30 min in `server.js`.
- Login: 5 failed attempts → 15-minute lockout.

---

## 14. Frontend structure

### Routes (`app.routes.ts`)

| Path | Component | Guard |
| --- | --- | --- |
| `/` | HomeComponent | — |
| `/markets` | MarketsComponent | (placeholder authGuard, will be refined) |
| `/community` | CommunityComponent | — (actions require login) |
| `/community/c/:id` | CommunityPublicDetailComponent | — |
| `/community/p/:id` | CommunityPrivateDetailComponent | authGuard |
| `/community/p/:id/details` | CommunityPrivateDetailsComponent | authGuard |
| `/community/t/:slug` | TopicDetailComponent | — |
| `/community/t/:slug/p/:postId` | PostRedditDetailComponent | — |
| `/community/discussion/new/:commentId` | DiscussionPageComponent | authGuard |
| `/community/discussion/:discussionId` | DiscussionPageComponent | authGuard |
| `/profile/:username` | ProfileComponent | — |
| `/search` | SearchComponent | — |
| `/settings` | SettingsComponent | authGuard |
| `/login` | LoginComponent | — |
| `/register` | RegisterComponent | — |

⚠️ Any change to `app.routes.ts` must be flagged to the user (potential merge conflict).

### Main components

**Community feed:**
- `CommunityComponent` — 3-column layout with its own header (replaces global navbar), left sidebar (Home + Search nav, MY COMMUNITIES, TOPICS, sticky Create Community), central feed (Trending/Following + create-post + posts + infinite scroll), right sidebar (copyright).
- `PostCardComponent` — reusable PostX card. Header (avatar/initial + author + time + community badge + 3-dot menu — only if the user has actions available: pin/unpin for leader, delete for owner/mod), body (text with See more at 280 chars, image/video with fallback), footer (like + comments). Inline comments (5 + Load more, 1 level, optimistic add).
- `PostSkeletonComponent`, `EmojiPickerComponent`, `ToastService`.
- `CreateCommunityModalComponent` — public/private. On success redirects to `/community/c/:id` (public) or `/community/p/:id` (private).
- `DiscoverCommunitiesPopupComponent`, `TopicSearchPopupComponent`.

**Communities:**
- `CommunityPublicDetailComponent` — banner + Join/Leave + create-post + feed.
- `CommunityPrivateDetailComponent` — non-member view (request flow) and member view (feed + side panels). PostCard with `communityContext` for Pin/Unpin.
- `CommunityMembersPanelComponent`, `PendingRequestsPanelComponent`.
- `CommunityPrivateDetailsComponent` — full-page management view.

**Topics:**
- `TopicDetailComponent` — banner + Top/Recent + create-PostReddit + feed.
- `PostRedditCardComponent` — vote column + title link + meta + clamp + media + comment count + delete (owner/mod).
- `PostRedditDetailComponent` — full view + `PostRedditCommentSectionComponent` (no likes, replies 1 level, optimistic).

**Others:**
- `DiscussionPageComponent` — chat-style (new + existing).
- `ProfileComponent` — header with cover/avatar/follow + community chips + PostX feed + followers/following modal.
- `SettingsComponent` — 3 independent sections with Reactive Forms.
- `SearchComponent` — own dynamic input (debounced, replaceUrl), tabs All/Users/Posts/Communities, top 3 per category in all mode + pagination in filtered mode.
- `LoginComponent`, `RegisterComponent`.
- `MarketsComponent` + `EconomicCalendarComponent`.
- Shared: `NavbarComponent` (hidden on /community), `ToastComponent`, `EmojiPickerComponent`, `SearchBarComponent` (deprecated in the Community header but still exists), `HeaderComponent`.

### Core services

- `AuthService` — token in memory, `currentUser` signal, `isAuthenticated` computed; login/register/logout/refresh/getToken/loadCurrentUser/updateCurrentUser.
- `authInterceptor` — functional, attaches Bearer, retries once on 401 via `/auth/refresh`, logout + redirect on failure.
- `authGuard` — functional, redirects to `/login` if not authed.
- `app.config.ts` — registers interceptor + `provideAppInitializer` to restore session on bootstrap.
- `CommunityService` — single service for everything: getMyCommunities, getFeed, createPost (FormData), like/delete/comments, public/private CRUD + members, topics + PostReddit + comments, discover, pinPost. `communityMembershipChanged$` Subject for syncing across components.
- `ProfileService`, `SearchService`, `ToastService`.

---

## 15. Code conventions

- Angular components: standalone, signals when possible, lazy-loaded with `loadComponent`.
- Backend: async/await, errors via `next(err)`, never callbacks.
- TypeScript strict mode on.
- CSS variables in `frontend/src/styles/variables.css`. Each feature has its own `*.component.css`.
- **Per-page DESIGN.md:** `frontend/src/app/features/<feature>/DESIGN.md`. When you make design changes on a page, update only its DESIGN.md, not the ones for other pages or any global file.

---

## 16. Project status

- ✅ **Phase 1 — Infrastructure.** Structure, scaffolds, Docker.
- ✅ **Phase 2 — Auth.** User model, JWT, register/login/logout/refresh/me, profile + password, lockout 5/15 min, Settings, Login, Register, auth-aware Navbar.
- 🔄 **Phase 3 — Community (almost complete).**
  - Backend: complete (feed, PostX, public, private, topics + PostReddit, profiles + follow, search, discussions, discover).
  - Frontend: full Community page, Profile, Public/Private community detail, Topic detail + PostReddit detail + Reddit comments, Discover popup, Discussion page (chat), full Search (header dropdown + dynamic page).
- 🔄 **Phase 4 — Markets.** Overview live tickers + TradingView + Economic Calendar done. Pending: per-asset detail, watchlist, alerts.
- ⬜ **Phase 5 — AI assistant + Home polish.** Pending.

---

## 17. Rules and expected behavior

1. **Commits:** always remind the user to commit when a feature is finished.
2. **CLAUDE.md and context:** update the CLAUDE.md files (root, frontend, backend) and `README.md` whenever an important feature is added. This `context.md` is regenerated only when the global picture changes.
3. **Changes to `app.routes.ts`:** warn the user and flag possible merge conflicts (the partner works on `feat/markets`, the user on `feat/header` and community).
4. **Minimal communication:** do not explain steps or show progress unless asked. Final reply brief, stating what was done.
5. **Community work:** if you touch anything in Community and you have doubts, read `COMMUNITY.md` in full before writing code.
6. **Language:** the user (Jan, INSTI student) writes in Catalan. Reply in Catalan unless told otherwise.
7. **Do not invent endpoints/services/components.** Verify against the code before citing them — docs may lag behind reality.
8. **DESIGN.md scope:** a design change updates only the DESIGN.md of the affected page.
9. **No Bootstrap.** No other CSS frameworks. Tailwind via CDN only as complement.
10. **Secret tokens** (Finnhub, Twelve Data, OpenAI, JWT secrets) always on the backend. Never expose them to the frontend.

---

## 18. Git flow

```
main
└── dev
    ├── feat/auth-community  (Jan — phases 2, 3, header)
    │   ├── feat/header  ← current
    │   └── ...
    └── feat/markets         (partner — phase 4)
```
- Always `merge --no-ff`.
- Delete feature branches after merging.
- Tag main when a phase is completed (`v1.0-phaseN`).
- Sync with `dev` periodically.

---

## 19. Things that DO NOT exist yet (don't invent uses)

- `/ai` route and floating AI widget (Phase 5).
- Watchlist, alerts, per-asset Markets pages.
- User avatar upload (only community covers / post media).
- Public ↔ private community conversion.
- Push notifications.

---

End of context. If you need more functional detail on Community, read
`COMMUNITY.md`. For pending tasks, see `FUTURS_CANVIS.txt` and `BUGS.txt`.
