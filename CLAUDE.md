# MarketHub — Project Context

## What this is

Financial web portal + social network. Users share market analysis,
follow economic calendar, interact in communities. Stack: Angular
frontend, Node/Express backend, MongoDB, Docker.

## Repo structure

/frontend → Angular SPA (port 4200)
/backend → Express API (port 3000)
/docker-compose.yml → starts all services (mongo, backend, frontend)
/.env → environment variables (not committed)
/.env.example → template for .env
/COMMUNITY.md → full functional specification of the Community page

## Tech decisions (don't change these)

- Frontend: Angular 17+ standalone components, CSS custom as default. Tailwind CSS is allowed (loaded via CDN in `frontend/src/index.html` with a custom config). Do NOT use Bootstrap or other frameworks.
- Backend: Express MVC pattern (/models /controllers /routes /middleware)
- DB: MongoDB 7 with Mongoose
- Auth: JWT (access token in memory, refresh token httpOnly cookie)
- CSS custom + CSS variables in /frontend/src/styles/variables.css are the default. Tailwind (via CDN) is permitted as a complement for speed in specific components (e.g. Markets). The "cdn.tailwindcss.com should not be used in production" console warning is accepted for now.
- Containerization: Docker with docker-compose

## Environment

- Run all services: docker-compose up --build
- Frontend dev (local): cd frontend && ng serve
- Backend dev (local): cd backend && npm run dev (nodemon)
- MongoDB: localhost:27017, db name: markethub
- Inside Docker, backend connects to mongodb://mongo:27017/markethub

## Code conventions

- Angular: standalone components, signals for state when possible
- Backend: async/await, no callbacks, errors via next(err)
- All API routes prefixed with /api/v1
- TypeScript strict mode on
- Error responses follow format: { success: false, message, code }
- Success responses follow format: { success: true, ... }

## Docker

- docker-compose.yml defines 3 services: mongo, backend, frontend
- Volume mounts for live reload in dev: ./backend:/app, ./frontend:/app
- Anonymous volumes for node_modules: /app/node_modules
- .dockerignore in both /backend and /frontend

## Page structure & navigation logic

- / → Landing page (Home). Public. Only for non-authenticated users.
  Authenticated users will be redirected to /markets (Phase 2).
- /markets → Markets dashboard. Visible to all, actions require login.
- /community → Community feed. Visible to all, actions require login.
- /community/c/:id → Public community detail (visible to all).
- /community/p/:id → Private community detail (auth required).
- /community/p/:id/details → Community members + pending requests (auth required).
- /community/t/:slug → Discussion topic (visible to all).
- /community/t/:slug/p/:postId → PostReddit detail (visible to all).
- /community/discussion/new/:commentId → Open new comment-thread discussion (auth required).
- /community/discussion/:discussionId → Comment-thread discussion (auth required).
- /search → Full search results page.
- /login → Public.
- /register → Public.
- /settings → Private. Change username, email, password.
- /profile/:username → Public user profile page.

The Home page is the source of the global design system.
Global design tokens will be extracted from it and documented in
/frontend/DESIGN.md.

## Project status

✅ Phase 1: Infrastructure
✅ Base folder structure
✅ Backend Express scaffold (Express, Mongoose, dotenv, cors, MVC)
✅ Frontend Angular scaffold (standalone components, routing, ApiService)
✅ Docker setup (docker-compose + Dockerfiles + .dockerignore)

✅ Phase 2: Authentication
✅ User model (username, email, passwordHash, role, avatar, bio,
loginAttempts, lockUntil, createdAt)
✅ Seed script for superadmin and moderator users
✅ JWT auth (access token in memory, refresh token httpOnly cookie)
✅ Auth API: register, login, logout, refresh, me
✅ Profile API: edit profile (username, email, avatar, coverImage, bio), change password
✅ Login attempt limiting (5 attempts → 15 min lockout)
✅ AuthService, AuthInterceptor, AuthGuard in Angular
✅ Login and Register components
✅ Auth-aware Navbar
✅ Settings page (`/settings`) — profile, account (email), password sections

🔄 Phase 3: Community
✅ Models: PostX, PostReddit, Comment, CommunityPublic,
CommunityPrivate, DiscussionTopic, Discussion, DiscussionMessage + User model updated
✅ Seed: discussion topics
✅ File upload setup (multer)
✅ API: general feed and PostX
✅ API: public communities
✅ API: private communities (incl. discover endpoint with sort/type filters)
✅ API: discussion topics + PostReddit + voting
✅ API: comment-thread discussions (open-from-comment chat)
✅ API: user profiles and following
✅ API: general search
✅ Frontend: Community page (feed, create-post, emoji, media, skeletons, retry, toast)
✅ Frontend: Public user profile (`/profile/:username`)
✅ Frontend: Public + Private community detail pages
✅ Frontend: Topic detail + PostReddit detail + Reddit comments (one-level nesting)
✅ Frontend: Discover communities popup (sort/type filters, debounced search)
✅ Frontend: Comment-thread discussion page (real-time chat-style UI)
✅ Frontend: Search bar (header dropdown) + full search page

🔄 Phase 4: Markets
✅ Markets Overview (live tickers via Finnhub + Twelve Data + CoinGecko, TradingView widgets)
✅ Economic Calendar component
⬜ Per-asset detail pages, watchlist, alerts

⬜ Phase 5: AI assistant + Home polish

## Rules

- ALWAYS REMEMBER THE USER TO COMMIT CHANGES ONCE A FEATURE IS COMPLETED.
- UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION.
- EVERY TIME YOU MAKE A CHANGE IN app.routes.ts MENTION IT TO THE USER AND WARN HIM OF THE POSSIBLE MERGE CONFLICT.
- Do not explain anything unless explicitly asked to.
- Do not describe steps unless explicitly asked to.
- Do not show progress unless explicitly asked to.
- Return only a brief explanation of the changes made once you finish.
<!-- - EVERY TIME YOU WORK ON ANYTHING RELATED TO THE COMMUNITY PAGE, READ
  /COMMUNITY.md FIRST AND FULLY BEFORE WRITING ANY CODE. IT CONTAINS
  THE COMPLETE FUNCTIONAL SPECIFICATION AND ALL BUSINESS RULES.
