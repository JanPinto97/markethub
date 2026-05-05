# MarketHub — Frontend

## Overview

Angular SPA serving the MarketHub UI. Runs on port 4200.

## Structure

```
/src/app
  app.ts               → Root component
  app.config.ts        → App config (providers: router, httpClient)
  app.routes.ts        → Lazy-loaded route definitions

  /core
    /guards
      auth.guard.ts      → Route guard for authenticated pages
    /interceptors
      auth.interceptor.ts → HTTP interceptor for auth headers
    /services
      api.service.ts     → Base API service for HTTP calls
      auth.service.ts    → Authentication service

  /features
    /home
      home.component.ts  → Landing page (non-authenticated)
    /markets
      markets.component.ts → Markets dashboard
      DESIGN.md
    /community
      community.component.ts → Community page
      DESIGN.md
    /search
      search.component.ts  → Full search results page (/search?q=&type=&page=)
      search.service.ts    → SearchService (GET /api/v1/search)
    /profile
      profile.component.ts → Public user profile page
      profile.service.ts
    /auth
      /login
        login.component.ts
      /register
        register.component.ts

  /shared
    /components
      /navbar
        navbar.component.ts → Navigation bar
      /toast
        toast.component.ts → Global toast notification (slide-in/fade-out)
      /emoji-picker
        emoji-picker.component.ts → Emoji popover (4 groups, close on outside click/Escape)
      /search-bar
        search-bar.component.ts → Reusable search input with debounced dropdown results (used in community header)
    /utils
      color.utils.ts     → getUsernameColor, getInitial (shared by PostCardComponent, CommunityComponent, ProfileComponent)

/src/styles
  variables.css          → CSS custom properties (colors, spacing, etc.)
  reset.css              → CSS reset
```

## Tech Stack

- Angular 21 (standalone components)
- TypeScript 5.9 (strict mode)
- RxJS 7.8
- Vitest for testing
- Node 20 Alpine in Docker

## Conventions

- All components are standalone (no NgModules)
- Use signals for state management when possible
- Lazy-loaded routes via `loadComponent`
- CSS custom + CSS variables from `/src/styles/variables.css` are the default approach
- Tailwind CSS allowed via CDN (loaded in `src/index.html` with a shared config). Prefer CSS variables + custom CSS for new components; Tailwind is permitted when a component already uses it (e.g. Markets) or when it's clearly faster for a specific case
- Do NOT use Bootstrap or other CSS frameworks
- Feature-based folder structure under `/features`

## Routes

| Path                 | Component          | Description           |
| -------------------- | ------------------ | --------------------- |
| `/`                                    | HomeComponent                    | Landing page                  |
| `/markets`                             | MarketsComponent                 | Markets dashboard             |
| `/community`                           | CommunityComponent               | Community feed                |
| `/community/c/:id`                     | CommunityPublicDetailComponent   | Public community detail       |
| `/community/p/:id`                     | CommunityPrivateDetailComponent  | Private community detail      |
| `/community/p/:id/details`             | CommunityPrivateDetailsComponent | Members + pending requests    |
| `/community/t/:slug`                   | TopicDetailComponent             | Discussion topic              |
| `/community/t/:slug/p/:postId`         | PostRedditDetailComponent        | PostReddit detail             |
| `/community/discussion/new/:commentId` | DiscussionPageComponent          | New comment-thread discussion |
| `/community/discussion/:discussionId`  | DiscussionPageComponent          | Existing discussion thread    |
| `/profile/:username`                   | ProfileComponent                 | Public user profile           |
| `/search`                              | SearchComponent                  | Search results page           |
| `/settings`                            | SettingsComponent                | Private settings page         |
| `/login`                               | LoginComponent                   | Login form                    |
| `/register`                            | RegisterComponent                | Registration form             |

## Running

- Docker: `docker-compose up` (from project root)
- Local: `ng serve` (port 4200)

## Docker

- Dockerfile: Node 20 Alpine, `npx ng serve --host 0.0.0.0`
- Volume mount `./frontend:/app` for live reload

## Components done

- HomeComponent, MarketsComponent (scaffolds)
- CommunityComponent — full 3-column layout with header, left sidebar (nav, communities, topics), central feed, right sidebar (copyright). Own header replaces global navbar. Sidebar left is fully functional: loads user communities from API, loads pinned topics from localStorage, skeleton/empty states, auth-aware visibility. Central feed fully functional: Trending/Following tabs (Following requires auth), create-post card (textarea auto-resize, 400 char counter, image+video upload with preview using createObjectURL and proper revokeObjectURL cleanup, auth-gated, emoji picker popover), real posts from `/posts/feed` with PostSkeletonComponent shimmer loading, retry button on error (initial + infinite scroll), toast on success. Pagination via IntersectionObserver (200px rootMargin), "You're all caught up 🎉" end state.
- PostCardComponent — standalone reusable card: header (avatar/initial with consistent HSL color, author name + @handle linking to /profile/:username, relative time "4h ago", community badge for public_community origin clickable to `/community/c/:communityId`, three-dot menu with Edit/Delete/Report by role — closes on outside click via HostListener), body (text with "See more" at 280 chars, image or native video player with "Video unavailable" fallback), footer (like with optimistic update + `liked` visual state, comments toggle). Inline comments section: loads via `/posts/:id/comments`, shows 5 at a time with "Load more", new comment input with auth gate and optimistic add. Delete flow uses native confirm + fade-out animation + `deleted` EventEmitter + toast. Hover: subtle box-shadow on card, menu always visible on mobile. Username color/initial from `/shared/utils/color.utils.ts`.
- PostSkeletonComponent — reusable shimmer skeleton (circle + lines) for loading feed states. Used in community feed, profile page, and community detail page.
- CommunityPublicDetailComponent — `/community/c/:id`. Banner with avatar/name/members/description + Join/Leave buttons (optimistic update). Leave confirmation dialog with special warning for last member (community auto-deletes). Create post box with three auth-aware states (not authed → sign-in banner, not member → disabled placeholder, member → full editor). Feed with PostCardComponent + infinite scroll + skeletons + error/empty states.
- CreateCommunityModalComponent — modal for creating public/private communities. Fields: name (3-50 chars, required), description (max 300, counter), avatar URL (live preview), type radio (public default, immutable warning). 409 inline error on name conflict. On success: closes modal, adds to sidebar, shows toast, redirects to detail page.
- ProfileComponent — public profile at `/profile/:username`. Header: cover image (url or username-derived color, 200px tall), avatar overlay (circle 90px, initial fallback), username, optional bio, follower/following stats (clickable), Follow/Unfollow button with optimistic update via `POST /users/:username/follow` (shows Edit Profile → /settings when owner, redirects to /login when not authed). Chips of public communities linking to `/community/c/:id`. Feed reuses `PostCardComponent` with `GET /users/:username/posts` (only `general` + `public_community`) and IntersectionObserver infinite scroll (200px rootMargin). Inline followers/following modal (tabs + Load more) via `GET /users/:username/followers|following`. States: skeleton (header + 3 post cards), 404 "User not found.", "No public posts yet." empty.
- SettingsComponent — private page at `/settings` (authGuard). Three independent sections (Profile / Account / Password), each with its own Reactive Form, save button, loading spinner, and inline success/error state. Profile: avatar URL + live circle preview (fallback to initial + username color), cover URL + live banner preview (fallback to username color), username, bio with 200-char counter and auto-resize. Account: email (private, never on public profile). Password: current/new/confirm with show/hide toggles, ≥8 char + match validation on frontend before calling `PUT /profile/password`. Save buttons disabled unless the section's values differ from initial; 409/401/400 errors surface inline next to the relevant field. On profile/account success calls `AuthService.updateCurrentUser` so navbar + rest of app reflect the change immediately. Success messages auto-hide after 4s.
- LoginComponent — email/password form, calls AuthService.login, redirects to /markets, shows API error (incl. 423 lock message)
- RegisterComponent — username/email/password form with client validation (email regex, username 3-30, password ≥8), calls AuthService.register
- TopicSearchPopupComponent — popover for searching/browsing all discussion topics. Positioned right of the "+ Add Topics" button. Search input with auto-focus, category filter chips (All, Core Markets, Macro, Assets, Trading), local filtering. Each row: category icon, name, Pin/Unpin button (updates sidebar immediately), Go button (navigates to `/community/t/:slug`). Closes on Escape and click outside. Topics loaded once from `GET /api/v1/topics`.
- DiscoverCommunitiesPopupComponent — modal for discovering all communities. Triggered by "+ Discover Communities" button in sidebar. Search with 350ms debounce, sort toggles (Popularity/Members/New), type multi-select toggles (Public/Private). Results show avatar, name, member count, type badge, Joined badge. Clicking navigates to `/community/c/:id` or `/community/p/:id`. Full-screen on mobile. Fetches from `GET /api/v1/communities/discover`.
- TopicDetailComponent — `/community/t/:slug`. Centered 640px column. Topic banner (icon, name, category, post count, description). Sort tabs (Top/Recent). Create PostReddit box (title required 300 chars + optional text 2000 chars + media + emoji). Feed with PostRedditCard + infinite scroll + skeletons. Auth-gated creation.
- PostRedditCardComponent — independent card for PostReddit (not shared with PostCardComponent). Vote column (▲ score ▼) with optimistic update and revert. Title links to `/community/t/:slug/p/:postId`. Author meta, 3-line text clamp, media preview (300px max), comment count footer. Three-dot menu for owner/mod delete with fade-out + toast.
- PostRedditDetailComponent — `/community/t/:slug/p/:postId`. Centered 720px column. Header with brand + back link to topic. Renders post inline (not via PostRedditCardComponent): vote column with optimistic update/revert, full title (H1, no clamp), author meta, full text (no clamp), media (max 600px). Owner/mod delete via three-dot menu → toast → redirect to topic. Loading skeleton, 404 "Post not found." inline state, network error retry. Embeds PostRedditCommentSectionComponent and syncs commentCount via `commentCountChange`.
- PostRedditCommentSectionComponent — independent section component (no likes anywhere). Inputs: postId, topicSlug, commentCount; Output: commentCountChange. Loads comments via `GET /topics/:slug/posts/:postId/comments` (page=1, limit=10, sorted createdAt desc). Skeleton loading, "No comments yet" empty, retry on error. New-comment box (auth-gated, sign-in placeholder otherwise) with auto-resize textarea + 400-char counter + optimistic add. One-level replies: `Reply` button on each comment + reply, single open reply box per section, "Replying to @username" label, optimistic insert into parent's `replies[]`. Replies always attach to root comment (single nesting). Three-dot menu (owner/mod/superadmin) with native confirm + `DELETE` endpoints; deleting a root comment removes its replies and decrements count by `1 + replyCount`. Local commentCount drives the section title and is emitted to the parent.
- CommunityPrivateDetailComponent — `/community/p/:id`. authGuard required. Two views: non-member (banner + join request flow with modal, pending/rejected states) and member (two-column: feed left 65% + side panel right 35%). Banner with avatar/name/members/description + Private badge + Leave/Delete buttons. Create post box for members. Feed shows pinned posts at top + regular posts sorted by trendingScore with role bonus. PostCardComponent extended with `communityContext` input for Pin/Unpin (leader only). Infinite scroll + skeletons + retry. Leave with confirm dialog (last member warning). Delete community (leader only) with explicit warning.
- CommunityMembersPanelComponent — sticky right panel listing all members with role badges (👑 Leader, 🛡 Mod, 🐋 Whale, Member). Leader sees Expel button (confirm) and Promote dropdown (absolute-positioned, closes on outside click) on hover for each member (except self). Emits expel/promote events to parent.
- PendingRequestsPanelComponent — below members panel, visible to leader/moderator. Lists pending join requests with avatar, username, time, message preview. Click opens detail modal (overlay, closes on Escape/overlay click) with full message + Accept/Reject. Emits accept/reject events.
- SearchBarComponent — reusable search input extracted to `/shared/components/search-bar/`. Debounced (350ms) dropdown with max 3 results per category (Users/Posts/Communities). Keyboard navigation (ArrowUp/Down/Enter/Escape). Click outside closes dropdown. "See all results" link navigates to `/search?q=`. Used in CommunityComponent header.
- SearchComponent — full search results page at `/search`. URL-driven via `ActivatedRoute.queryParams` (q, type, page). Filter tabs: All/Users/Posts/Communities. In "All" mode shows top 3 per category with "See all X" buttons. In filtered mode shows paginated results (10 per page). Skeleton loading, error retry, empty states. Uses SearchService.
- NavbarComponent — auth-aware: shows username+avatar+logout when authed, login/register links when not
- CommunityPrivateDetailsComponent — `/community/p/:id/details`. authGuard. Standalone members + requests management page (separate from the in-feed side panel). Lists all members with role badges, leader-only Expel/Promote actions, and pending join requests with Accept/Reject modal. Used as a full-page alternative to the embedded panels.
- DiscussionPageComponent — `/community/discussion/new/:commentId` and `/community/discussion/:discussionId`. authGuard. Chat-style UI for opening a threaded discussion from any PostX comment. New mode creates the discussion lazily on the first message; existing mode loads an active discussion. Auto-resizing textarea, message list scroll-to-bottom on send, reply-to-message label, paginated message history (cursor-based).
- MarketsComponent — `/markets`. Live tickers from Finnhub (US stocks), Twelve Data (forex/crypto/gold), CoinGecko (global crypto). TradingView widget for charting. Search dropdown with debounce + keyboard navigation. WebSocket for real-time price updates. Embeds EconomicCalendarComponent.
- EconomicCalendarComponent — under MarketsComponent. Date-range filtered economic events table (impact, country, event, forecast, actual). Sourced from market.service.ts.

## Core done

- AuthService — in-memory access token, `currentUser` signal, `isAuthenticated` computed, methods: login, register, logout, refreshToken, getToken, loadCurrentUser (refresh + /me on bootstrap), updateCurrentUser(patch) to merge changes into the in-memory user after profile edits
- authInterceptor — functional, attaches Bearer token, retries once on 401 via /auth/refresh, logs out + redirects to /login on failure
- authGuard — functional, redirects to /login when not authenticated
- User model interface (/core/models/user.model.ts)
- app.config.ts — registers interceptor and `provideAppInitializer` to restore session on startup
- CommunityService — getMyCommunities(), getTopicsByIds(), pinned topics localStorage helpers, getFeed(mode, page, limit), createPost(text, mediaFile?) via FormData, likePost(id), deletePost(id), getComments(postId), addComment(postId, text), getCommunityPublic(id), getCommunityPublicPosts(id, page), joinCommunityPublic(id), leaveCommunityPublic(id), createCommunityPublic(data), createCommunityPrivate(data), createCommunityPost(communityId, text, mediaFile?). `communityMembershipChanged$` Subject for syncing join/leave across components. getAllTopics(), getTopicDetail(slug), getTopicPosts(slug, sort, page), createTopicPost(slug, title, text?, mediaFile?), voteTopicPost(slug, postId, vote), deleteTopicPost(slug, postId). PostReddit detail + comments: getTopicPostDetail(slug, postId), getTopicPostComments(slug, postId, page, limit), addTopicComment(slug, postId, text), addTopicReply(slug, postId, commentId, text), deleteTopicComment(slug, postId, commentId) → returns `{removed}`, deleteTopicReply(slug, postId, commentId, replyId). Private community: getCommunityPrivate(id), getCommunityPrivatePosts(id, page), requestJoinPrivate(id, message?), acceptRequest(communityId, requestId), rejectRequest(communityId, requestId), expelMember(communityId, userId), changeMemberRole(communityId, userId, role), leaveCommunityPrivate(id), deleteCommunityPrivate(id), createCommunityPrivatePost(communityId, text, mediaFile?), pinPost(communityId, postId), discoverCommunities(search, sort, type). Exports PostX, PostAuthor, PostCommunity, PostComment, CommunityPublic, CommunityPrivate, CommunityPrivateDetail, CommunityMember, JoinRequest, CommunityRole, CreateCommunityDto, DiscoverCommunityItem, DiscussionTopicFull, PostReddit, RedditComment interfaces. Uses ApiService for JSON calls + raw HttpClient for FormData/DELETE.
- ProfileService — getProfile(username), getUserPosts(username, page), getFollowers(username, page), getFollowing(username, page), toggleFollow(username). Maps backend `followersCount` to `followerCount` in the `UserProfile` type to match the spec. Exports UserProfile, UserSummary, FollowToggleResult, PagedPosts, PagedUsers.
- SearchService — `search(query, type, page, limit)` calls `GET /api/v1/search` with query params. Returns `SearchResults` with users, posts, communities arrays + totals + pagination. Used by SearchBarComponent (dropdown) and SearchComponent (full page).
- ToastService — `show(message, type)` triggers a global toast. Signal-based, one toast at a time, auto-dismiss 3s with manual close.

## Routes done

| Path                 | Component                      | Guard                                                |
| -------------------- | ------------------------------ | ---------------------------------------------------- |
| `/`                  | HomeComponent                  | —                                                    |
| `/markets`           | MarketsComponent               | authGuard (placeholder — will be refined per-action) |
| `/community`         | CommunityComponent             | — (visible to all, actions require login)            |
| `/community/c/:id`   | CommunityPublicDetailComponent | — (visible to all, actions require login)            |
| `/community/p/:id`   | CommunityPrivateDetailComponent | authGuard (non-member sees join request view)       |
| `/community/p/:id/details` | CommunityPrivateDetailsComponent | authGuard                                       |
| `/community/t/:slug` | TopicDetailComponent           | — (visible to all, create post requires login)       |
| `/community/t/:slug/p/:postId` | PostRedditDetailComponent | — (visible to all, comment/vote require login)       |
| `/community/discussion/new/:commentId` | DiscussionPageComponent | authGuard                                  |
| `/community/discussion/:discussionId` | DiscussionPageComponent | authGuard                                   |
| `/search`            | SearchComponent                | — (public)                                           |
| `/profile/:username` | ProfileComponent               | — (public, Follow gated by login)                    |
| `/settings`          | SettingsComponent              | authGuard (private)                                  |
| `/login`             | LoginComponent                 | —                                                    |
| `/register`          | RegisterComponent              | —                                                    |

## Current Status

✅ Angular scaffold with standalone components
✅ Route structure with lazy loading (home, markets, community, auth)
✅ Core services structure (api, auth)
✅ Auth guard and interceptor scaffolded
✅ Shared navbar component
✅ CSS variables system — fully populated with design tokens (Tailwind CDN also available as complement)
✅ Docker containerized
✅ Community page scaffold: 3-column layout, header, sidebars, feed with placeholders
✅ App root hides global navbar on /community (community has its own header)

## Rules

<!-- - UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION. -->

- EVERY TIME YOU MAKE DESIGN CHANGES IN A PAGE, UPDATE THE DESIGN.MD FILE LOCATED IN THE SAME FOLDER OF THE PAGE. DO NOT UPDATE THE GLOBAL DESIGN.MD FILE, OR THE DESIGN.MD FILE OF ANOTHER PAGE.
