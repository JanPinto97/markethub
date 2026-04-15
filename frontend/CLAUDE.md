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
- No CSS frameworks — custom styles with CSS variables from `/src/styles/variables.css`
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
- HomeComponent, MarketsComponent, CommunityComponent (scaffolds)
- LoginComponent — email/password form, calls AuthService.login, redirects to /markets, shows API error (incl. 423 lock message)
- RegisterComponent — username/email/password form with client validation (email regex, username 3-30, password ≥8), calls AuthService.register
- NavbarComponent — auth-aware: shows username+avatar+logout when authed, login/register links when not

## Core done
- AuthService — in-memory access token, `currentUser` signal, `isAuthenticated` computed, methods: login, register, logout, refreshToken, getToken, loadCurrentUser (refresh + /me on bootstrap)
- authInterceptor — functional, attaches Bearer token, retries once on 401 via /auth/refresh, logs out + redirects to /login on failure
- authGuard — functional, redirects to /login when not authenticated
- User model interface (/core/models/user.model.ts)
- app.config.ts — registers interceptor and `provideAppInitializer` to restore session on startup

## Routes done
| Path         | Component          | Guard     |
| ------------ | ------------------ | --------- |
| `/`          | HomeComponent      | —         |
| `/markets`   | MarketsComponent   | authGuard (placeholder — will be refined per-action) |
| `/community` | CommunityComponent | authGuard (placeholder — will be refined per-action) |
| `/login`     | LoginComponent     | —         |
| `/register`  | RegisterComponent  | —         |

## Current Status

✅ Angular scaffold with standalone components
✅ Route structure with lazy loading (home, markets, community, auth)
✅ Core services structure (api, auth)
✅ Auth guard and interceptor scaffolded
✅ Shared navbar component
✅ CSS variables system (no framework)
✅ Docker containerized

## Rules

- UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION.
