# MarketHub — Project Context

## What this is

Financial web portal + social network. Users share market analysis,
follow economic calendar, interact in communities. Stack: Angular
frontend, Node/Express backend, MongoDB, Docker.

## Repo structure

```
/frontend          → Angular SPA (port 4200)
/backend           → Express API (port 3000)
/docker-compose.yml → starts all services (mongo, backend, frontend)
/.env              → environment variables (not committed)
/.env.example      → template for .env
```

## Tech decisions (don't change these)

- Frontend: Angular 17+ standalone components, CSS custom (no Bootstrap)
- Backend: Express MVC pattern (/models /controllers /routes /middleware)
- DB: MongoDB 7 with Mongoose
- Auth: JWT (access token in memory, refresh token httpOnly cookie)
- No CSS frameworks — custom variables in /frontend/src/styles/variables.css
- Containerization: Docker with docker-compose

## Environment

- Run all services: `docker-compose up --build`
- Frontend dev (local): `cd frontend && ng serve`
- Backend dev (local): `cd backend && npm run dev` (nodemon)
- MongoDB: localhost:27017, db name: markethub
- Inside Docker, backend connects to `mongodb://mongo:27017/markethub`

## Code conventions

- Angular: standalone components, signals for state when possible
- Backend: async/await, no callbacks, errors via next(err)
- All API routes prefixed with /api/v1
- TypeScript strict mode on
- Error responses follow format: `{ success: false, message, code }`
- Success responses follow format: `{ success: true, ... }`

## Docker

- `docker-compose.yml` defines 3 services: mongo, backend, frontend
- Volume mounts for live reload in dev: `./backend:/app`, `./frontend:/app`
- Anonymous volumes for node_modules: `/app/node_modules`
- `.dockerignore` in both /backend and /frontend

## Project Status

✅ Phase 1: Infrastructure
✅ Base folder structure
✅ Backend Express scaffold
✅ Frontend Angular scaffold
✅ Docker setup (docker-compose + Dockerfiles + .dockerignore)

## Rules

- ALWAYS REMEMBER THE USER TO COMMIT CHANGES ONCE A FEATURE IS COMPLETED.
- UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION.
- EVERY TIME YOU MAKE A CHANGE IN app.routes.ts MENTION IT TO THE USER AND WARN HIM OF THE POSSIBLE MERGE CONFLICT.
