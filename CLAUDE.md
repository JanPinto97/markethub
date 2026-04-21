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
- /markets → Main page after login. Visible to all, actions require login.
- /community → Main page after login. Visible to all, actions require login.
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
✅ Profile API: edit profile, change password
✅ Login attempt limiting (5 attempts → 15 min lockout)
✅ AuthService, AuthInterceptor, AuthGuard in Angular
✅ Login and Register components
✅ Auth-aware Navbar

🔄 Phase 3: Community
✅ Models: PostX, PostReddit, Comment, CommunityPublic,
CommunityPrivate, DiscussionTopic + User model updated
✅ Seed: discussion topics
✅ File upload setup (multer)
✅ API: general feed and PostX
✅ API: public communities
✅ API: private communities
✅ API: discussion topics
✅ API: user profiles and following
✅ API: general search
⬜ Frontend: Community page

⬜ Phase 4: Markets
⬜ Phase 5: AI assistant + Home

## Rules

- ALWAYS REMEMBER THE USER TO COMMIT CHANGES ONCE A FEATURE IS COMPLETED.
- UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION.
- EVERY TIME YOU MAKE A CHANGE IN app.routes.ts MENTION IT TO THE USER AND WARN HIM OF THE POSSIBLE MERGE CONFLICT.
- EVERY TIME YOU WORK ON ANYTHING RELATED TO THE COMMUNITY PAGE, READ
  /COMMUNITY.md FIRST AND FULLY BEFORE WRITING ANY CODE. IT CONTAINS
  THE COMPLETE FUNCTIONAL SPECIFICATION AND ALL BUSINESS RULES.
