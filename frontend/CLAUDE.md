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
    /auth
      /login
        login.component.ts
      /register
        register.component.ts

  /shared
    /components
      /navbar
        navbar.component.ts → Navigation bar

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

| Path         | Component          | Description       |
| ------------ | ------------------ | ----------------- |
| `/`          | HomeComponent      | Landing page      |
| `/markets`   | MarketsComponent   | Markets dashboard |
| `/community` | CommunityComponent | Community feed    |
| `/login`     | LoginComponent     | Login form        |
| `/register`  | RegisterComponent  | Registration form |

## Running

- Docker: `docker-compose up` (from project root)
- Local: `ng serve` (port 4200)

## Docker

- Dockerfile: Node 20 Alpine, `npx ng serve --host 0.0.0.0`
- Volume mount `./frontend:/app` for live reload

## Components done

- HomeComponent, MarketsComponent (scaffolds)
- CommunityComponent — full 3-column layout with header, left sidebar (nav, communities, topics), central feed, right sidebar (copyright). Own header replaces global navbar. Sidebar left is fully functional: loads user communities from API, loads pinned topics from localStorage, skeleton/empty states, auth-aware visibility. Central feed fully functional: Trending/Following tabs (Following requires auth), create-post card (textarea auto-resize, 400 char counter, image upload with preview, auth-gated), real posts from `/posts/feed` with pagination via IntersectionObserver (200px rootMargin), "You're all caught up 🎉" end state.
- PostCardComponent — standalone reusable card: header (avatar/initial with consistent HSL color, author name + @handle linking to /profile/:username, relative time "4h ago", community badge for public_community origin, three-dot menu with Edit/Delete/Report by role), body (text with "See more" at 280 chars, optional image at max-height 400px), footer (like with optimistic update + `liked` visual state, comments toggle). Inline comments section: loads via `/posts/:id/comments`, shows 5 at a time with "Load more", new comment input with auth gate and optimistic add. Delete flow uses native confirm + fade-out animation + `deleted` EventEmitter to parent.
- LoginComponent — email/password form, calls AuthService.login, redirects to /markets, shows API error (incl. 423 lock message)
- RegisterComponent — username/email/password form with client validation (email regex, username 3-30, password ≥8), calls AuthService.register
- NavbarComponent — auth-aware: shows username+avatar+logout when authed, login/register links when not

## Core done

- AuthService — in-memory access token, `currentUser` signal, `isAuthenticated` computed, methods: login, register, logout, refreshToken, getToken, loadCurrentUser (refresh + /me on bootstrap)
- authInterceptor — functional, attaches Bearer token, retries once on 401 via /auth/refresh, logs out + redirects to /login on failure
- authGuard — functional, redirects to /login when not authenticated
- User model interface (/core/models/user.model.ts)
- app.config.ts — registers interceptor and `provideAppInitializer` to restore session on startup
- CommunityService — getMyCommunities(), getTopicsByIds(), pinned topics localStorage helpers, getFeed(mode, page, limit), createPost(text, mediaFile?) via FormData, likePost(id), deletePost(id), getComments(postId), addComment(postId, text). Exports PostX, PostAuthor, PostCommunity, PostComment, FeedResponse interfaces. Uses ApiService for JSON calls + raw HttpClient for FormData/DELETE.

## Routes done

| Path         | Component          | Guard                                                |
| ------------ | ------------------ | ---------------------------------------------------- |
| `/`          | HomeComponent      | —                                                    |
| `/markets`   | MarketsComponent   | authGuard (placeholder — will be refined per-action) |
| `/community` | CommunityComponent | — (visible to all, actions require login)            |
| `/login`     | LoginComponent     | —                                                    |
| `/register`  | RegisterComponent  | —                                                    |

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

- UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION.
- EVERY TIME YOU MAKE DESIGN CHANGES IN A PAGE, UPDATE THE DESIGN.MD FILE LOCATED IN THE SAME FOLDER OF THE PAGE. DO NOT UPDATE THE GLOBAL DESIGN.MD FILE, OR THE DESIGN.MD FILE OF ANOTHER PAGE.
