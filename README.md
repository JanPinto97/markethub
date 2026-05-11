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

**Docker (recommended):**

```bash
docker-compose up --build
```

Services start at:

- Frontend → http://localhost:4200
- Backend → http://localhost:3000
- MongoDB → localhost:27017 (db: `markethub`)

**Local dev:**

```bash
cd backend && npm run dev   # nodemon, requires Mongo on localhost:27017
cd frontend && ng serve     # port 4200
```

**Seeders:**

```bash
cd seeder && npm run bootstrap 5   # seeders, requires Mongo on localhost:27017 and Ollama running
cd seeder && npm run orchestrate       # seeders, requires Mongo on localhost:27017 and Ollama running
```

## Environment variables

Copy `.env.example` to `.env` and fill in values (JWT secrets, DB URI, etc.).
The backend loads `.env` from the project root via dotenv.

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
