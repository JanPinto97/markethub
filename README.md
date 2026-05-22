# MarketHub

Financial web portal and social network. Users share market analysis, follow the
economic calendar, and interact in communities (X-style and Reddit-style discussions).

## Stack

- **Frontend:** Angular 21 (standalone components, signals), TypeScript 5.9, custom CSS + CSS variables, Tailwind CDN as complement
- **Backend:** Node.js 20 + Express 5, MongoDB 7 + Mongoose 9, JWT auth (access in memory, refresh httpOnly cookie)
- **Infrastructure:** Docker + docker-compose
- **External APIs (Markets):** Finnhub, Twelve Data, CoinGecko, TradingView widgets

## Repo structure

```
/frontend           → Angular SPA (port 4200)
/backend            → Express API (port 3000), MVC (models/controllers/routes/middleware)
/docker-compose.yml → mongo + backend + frontend services
/.env.example       → environment template
/CLAUDE.md          → root project context
/COMMUNITY.md       → full Community page functional specification
/frontend/CLAUDE.md → frontend-specific context
/backend/CLAUDE.md  → backend-specific context
```

## Running

### Docker (recommended)

The stack defines 3 services in `docker-compose.yml`: `mongo`, `backend`, `frontend`.
Source folders are bind-mounted for live reload (`./backend:/app`, `./frontend:/app`),
and `node_modules` are kept inside anonymous volumes (`/app/node_modules`) so the host
versions don't override the container's.

**First-time start (or after pulling new code):**

```bash
cp .env.example .env       # then edit values (JWT secrets, Google OAuth, etc.)
docker-compose up --build
```

Services start at:

- Frontend → http://localhost:4200
- Backend → http://localhost:3000
- MongoDB → localhost:27017 (db: `markethub`)

**Subsequent runs (no dependency or Dockerfile changes):**

```bash
docker-compose up
```

**Stop:**

```bash
docker-compose down                # stops containers, keeps volumes (DB + node_modules persist)
docker-compose down -v             # ⚠️ also wipes volumes — you'll lose MongoDB data
```

**After adding/removing a dependency in `backend/package.json` or `frontend/package.json`:**

The anonymous `node_modules` volume is not refreshed by `--build` alone.
You must either drop it or install inside the running container:

```bash
# Option A — recreate the node_modules volume cleanly (recommended)
docker-compose down
docker volume ls | grep _node_modules            # find the exact volume name
docker volume rm <markethub_backend_node_modules>  # repeat for frontend if needed
docker-compose up --build

# Option B — install live in the running container (quick fix)
docker-compose exec backend npm install
docker-compose exec frontend npm install
docker-compose restart backend frontend
```

**Rebuild a single service:**

```bash
docker-compose up --build backend
docker-compose up --build frontend
```

**Logs and shell:**

```bash
docker-compose logs -f backend
docker-compose exec backend sh
docker-compose exec mongo mongosh markethub
```

**Seed the database (reviewer / first-time setup):**

```bash
docker-compose exec backend npm run seed:demo
```

`seed:demo` restores a frozen MongoDB dump (`backend/seed/demo-data.archive.gz`)
**including users, topics, communities, posts, comments and notifications**, plus
the bundled uploads tarball. After running it the app is fully populated and ready
to browse — no need to run `seed` or `seed:topics` separately.

Demo accounts (all with password `Test1234!`): `alice_trader`, `bob_crypto`,
`carol_quant`, `david_value`, `eve_scalper`, `frank_macro`, `grace_whale`,
`henry_analyst`. Superadmin/moderator accounts use the credentials embedded in
the dump.

Advanced (only for regenerating the demo dump from a dev environment with content
already loaded via `seed:dev`):

```bash
docker-compose exec backend npm run seed:generate-dump
```

**Reset the database only (keep node_modules):**

```bash
docker-compose down
docker volume rm <markethub_mongo_data>
docker-compose up
```

### Local dev (without Docker)

```bash
cd backend && npm install && npm run dev   # nodemon, requires Mongo on localhost:27017
cd frontend && npm install && ng serve     # port 4200
```

**Seeders:**

```bash
cd seeder && npm run bootstrap 5   # seeders, requires Mongo on localhost:27017 and Ollama running
cd seeder && npm run orchestrate       # seeders, requires Mongo on localhost:27017 and Ollama running
```

## Environment variables

Copy `.env.example` to `.env` and fill in values. The backend loads `.env` from the
project root via dotenv.

Required variables:

- `PORT`, `MONGO_URI`, `NODE_ENV`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SUPERADMIN_*`, `MODERATOR_*` (used by seeders)

Optional (Google OAuth — without these the `Continue with Google` button returns 503,
but email/password login still works):

- `FRONTEND_URL` (default `http://localhost:4200`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` (must match the redirect URI registered in Google Cloud
  Console — typically `http://localhost:3000/api/v1/auth/google/callback`)

After editing `.env`, restart the backend container so it picks up the new values:

```bash
docker-compose restart backend
```

## API

All routes are prefixed with `/api/v1`. See `backend/CLAUDE.md` for the full endpoint list.

- **Success response:** `{ success: true, ... }`
- **Error response:** `{ success: false, message, code }`

## Page routes

| Path                                   | Access                     |
| -------------------------------------- | -------------------------- |
| `/`                                    | Landing (public)           |
| `/markets`                             | Markets dashboard          |
| `/community`                           | Community feed             |
| `/community/c/:id`                     | Public community detail    |
| `/community/p/:id`                     | Private community (auth)   |
| `/community/p/:id/details`             | Members/requests (auth)    |
| `/community/t/:slug`                   | Discussion topic           |
| `/community/t/:slug/p/:postId`         | PostReddit detail          |
| `/community/discussion/new/:commentId` | Open new discussion (auth) |
| `/community/discussion/:discussionId`  | Discussion thread (auth)   |
| `/profile/:username`                   | Public user profile        |
| `/search`                              | Full search results        |
| `/settings`                            | Private settings (auth)    |
| `/login`, `/register`                  | Auth forms                 |

## Project status

- **Phase 1: Infrastructure** — Done
- **Phase 2: Authentication** — Done
- **Phase 3: Community** — Mostly done (feed, public/private communities, topics, profiles, search, discussions, discover popup)
- **Phase 4: Markets** — In progress (Overview with live tickers from 3 APIs, Economic Calendar)
- **Phase 5: AI assistant + Home polish** — Pending

## Conventions

- Angular: standalone components, signals for state when possible, lazy-loaded routes
- Backend: async/await + `next(err)` error propagation, MVC layout
- TypeScript strict mode
- Custom CSS + variables in `frontend/src/styles/variables.css` (Tailwind via CDN allowed)
- No Bootstrap or other CSS frameworks

See `CLAUDE.md` and `COMMUNITY.md` for detailed conventions and the community spec.
