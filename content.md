# MarketHub — Content Overview

This document describes everything a user can see and do inside the MarketHub platform, excluding the landing page (`/`). It covers the two main pillars of the product: **Community** (social network) and **Markets** (financial data hub), plus the supporting account/profile pages.

## Community section (`/community`)

A social network organised around three content models: **PostX** (Twitter-like timeline posts), **PostReddit** (long-form posts inside discussion topics), and **chat-style threaded discussions** spawned from PostReddit comments. The names of these content models should not be visible to the user in any case.

### `/community` — main feed

Three-column layout (header, left sidebar, central feed, right sidebar).

**Left sidebar**:

- Quick links: Home, Search.
- **My Communities** — list of joined communities (public & private), each with avatar, name and `[Public]` / `[Private]` tag. Links to the corresponding detail page.
- **Discover Communities** button → opens a popup with all communities, debounced search, sort toggles (Popularity / Members / New), and type filters (Public / Private).
- **Topics** — pinned discussion topics stored in localStorage; clicking opens the topic.
- **Add Topics** button → popover to search & pin any topic (filters: All, Core Markets, Macro, Assets, Trading).
- **Create Community** button → modal to create a public or private community (name, description, avatar URL, type).

**Central feed**:

- **Tabs**: `Trending` (public) and `Following` (auth-only).
- **Create-post card** (auth-required):
  - Auto-resizing textarea (400-char counter).
  - Image (jpg/png/gif/webp, max 10 MB) or video (mp4/webm/quicktime, max 100 MB) upload with live preview.
  - Emoji picker (4 emoji groups, closes on Escape/outside click).
- **Post stream** of PostX cards with infinite scroll, skeleton loaders, retry on error, and "You're all caught up 🎉" end state.

**PostX card** elements:

- Avatar (initial fallback with consistent HSL color), author name, `@handle`, relative time, community badge (if posted to a public community).
- Body: text (with "See more" past 280 chars), image or native video player.
- Like button with optimistic update.
- Comments toggle → inline thread (5 at a time, "Load more", optimistic add).
- Three-dot menu: Edit / Delete / Report (role-aware).

### `/community/c/:id` — public community detail

- Banner with avatar, name, member count, description.
- **Join / Leave** button with optimistic update. Leaving the last member auto-deletes the community (with explicit warning).
- Create-post box with three states: not authenticated → sign-in banner, not a member → disabled placeholder, member → full editor.
- Feed of PostX cards specific to that community, with infinite scroll and skeletons.

### `/community/p/:id` — private community detail (auth required)

- **Non-member view**: banner + join request flow (modal with optional message; pending/rejected states).
- **Member view**: two-column layout (feed 65% + side panel 35%).
- **Banner**: avatar, name, member count, description, Private badge, Leave/Delete buttons (Delete only for the leader, with explicit warning).
- **Feed**: pinned posts at top + regular posts sorted by trending score (with bonus for leader/moderator). Pin/Unpin is available on each post for the leader.
- **Side panel** (members + pending requests):
  - **Members list** — every member with their role badge (👑 Leader, 🛡 Mod, 🐋 Whale, Member). On hover the leader sees Expel (confirm) and Promote dropdown.
  - **Pending join requests** — visible to leader/mod; each row opens a modal with the full message + Accept/Reject buttons.

### `/community/p/:id/details`

Full-page version of the members + requests management panel — same expel / promote / accept / reject actions, but presented standalone.

### `/community/t/:slug` — discussion topic

Reddit-style topic page (centred 640 px column):

- Topic banner with icon, name, category, post count, description.
- Sort tabs: Top / Recent.
- Create-PostReddit form: title (required, 300 chars), optional text (2000 chars), media, emoji picker.
- Feed of PostReddit cards (infinite scroll, skeletons).

**PostReddit card** elements:

- Vote column (▲ score ▼) with optimistic update.
- Title (links to the post detail).
- Author meta, 3-line text clamp, media preview (300 px max), comment count.
- Three-dot menu for owner/mod delete.

### `/community/t/:slug/p/:postId` — PostReddit detail

- Centered 720 px column.
- Vote column, full title (H1), full text, media (up to 600 px).
- **Comment section**:
  - List of root comments (paged 10 at a time, sorted newest-first), each with a `Reply` button.
  - One level of nesting: replies always attach to the root comment.
  - Auth-gated add (auto-resize textarea, 400-char counter, optimistic).
  - Three-dot menu for owner/mod/superadmin delete (deleting a root removes its replies and decrements count accordingly).

### `/community/discussion/new/:commentId` and `/community/discussion/:discussionId`

Private chat-style threaded discussion opened from any PostX comment:

- Auto-resizing textarea.
- "Replying to @username" label.
- Paginated cursor-based message history.
- New discussion is created lazily when sending the first message.

### `/search`

Cross-platform search with URL-driven state (`?q=&type=&page=`):

- Tabs: All / Users / Posts / Communities.
- "All" mode: top 3 per category with "See all X" buttons.
- Filtered mode: 10 results per page.
- Skeleton loading, retry on error, empty states.

---

## Markets section (`/markets`)

The financial dashboard, organised in four tabs: **Overview**, **Calendar**, **News**, **Charts**.

### Live data sources

- **Finnhub** — US stocks and ETFs (real-time WebSocket).
- **Twelve Data** — forex, crypto, gold, indices.
- **CoinGecko** — broad crypto coverage.
- **Yahoo Finance (RapidAPI)**, **Tiingo**, **Polygon**, **Alpha Vantage**, **NewsData**, **Marketaux** — supplementary news and historical data.

### Overview tab

- **Watchlist of live tickers** (default selection):
  - Crypto: BTC/USD, ETH/USD
  - Forex: EUR/USD
  - Commodities: GOLD (XAU), CRUDE OIL (WTI)
  - Indices: S&P 500 (SPY), NASDAQ 100 (QQQ)
  - Stocks: AAPL, NVDA, TSLA
- Each row shows live price, % change and a sparkline; clicking it loads it into the main chart.
- **Search dropdown** — debounced symbol search across providers with keyboard navigation (Arrow/Enter/Escape).
- **TradingView widget** — interactive chart for the selected symbol (timeframe, indicators, drawing tools).
- **Market sentiment indicator** (Fear & Greed style) with classification ("Extreme Fear" → "Extreme Greed").
- **Top news headlines** with click-through to the detailed News tab.

### Economic Calendar tab

Date-range filtered table of upcoming and past economic events:

- Columns: impact (low/medium/high), country flag, event name, forecast, actual, time.
- Date picker to jump to a specific day.
- Filters by impact and country.

### News tab

- Aggregated finance news feed (multiple providers).
- Article cards with headline, source, timestamp, snippet, image.
- Click opens a detail view (full article preview + link to source).
- "From Overview" deep-link: a teaser on the Overview tab can open a specific article on first render.

### Charts tab

Dedicated chart playground:

- Multiple symbol overlays.
- Custom timeframes (1m → 1M).
- Technical indicators (moving averages, RSI, MACD, volume, etc.).
- Drawing tools and annotation save/restore.

### Real-time behavior

- WebSocket connection to Finnhub for tick-by-tick US equities.
- Periodic polling refresh for non-WebSocket providers.
- Clock and timezone in the footer; auto-refresh interval configurable.

---

## Account & Profile

### `/profile/:username`

Public profile page (accessible without login, actions gated):

- **Header**: cover image (URL or username-derived color), 90 px avatar overlay (initial fallback), username, optional bio, follower/following counts (clickable).
- **Follow / Unfollow** button with optimistic update (Edit Profile shortcut → `/settings` if owner).
- **Communities chips** — public communities the user belongs to.
- **Posts feed** — only `general` + `public_community` posts, infinite scroll, skeletons.
- **Followers / Following modal** — tabbed list with "Load more" paging.

### `/settings` (auth required)

Three independent sections, each with its own form, save button, spinner and inline success/error:

- **Profile**: avatar URL (live preview), cover URL (live preview), username, bio (200-char counter, auto-resize). Saving propagates to AuthService so the header updates instantly.
- **Account**: email (private, never shown on the public profile).
- **Password**: current / new / confirm with show/hide toggles, ≥ 8 char + match validation; surfaces 401/400/409 errors inline.

### `/login` and `/register`

- Card-style centred forms with editorial typography.
- Email + password (login) or username + email + password (register), with show/hide toggle and 8-char + email-regex validation.
- Green gradient "Sign In" / "Sign Up" button.
- Session-expired banner on the login page when redirected from a protected route.
- Inline error message and loading spinner.
- Cross-link between Sign In and Sign Up at the bottom.

---

## Behavioural rules across the platform

- **Auth state**: actions like creating posts, voting, joining communities, following users, or replying in discussions require sign-in; the UI gracefully gates them (sign-in banners or redirects).
- **Optimistic updates** are used for likes, votes, follows, joins, pins, post deletes, comment adds — with revert on error.
- **Toast feedback** confirms every successful create/delete/update.
- **Skeleton loaders** appear during initial loads; **infinite scroll** uses an IntersectionObserver with a 200 px root margin.
- **Role-aware UI**: leaders, moderators and superadmins see additional actions (pin, expel, promote, delete others' content).
- **Real-time accents**: live market badges in the header, WebSocket ticker prices in the Markets dashboard.
