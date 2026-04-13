# MarketHub — Project Context

## What this is

Financial web portal + social network. Users share market analysis,
follow economic calendar, interact in communities. Stack: Angular
frontend, Node/Express backend, MongoDB, Docker.

## Repo structure

/frontend → Angular SPA (port 4200)
/backend → Express API (port 3000)
/docker-compose.yml → starts all services

## Tech decisions (don't change these)

- Frontend: Angular 17+ standalone components, CSS custom (no Bootstrap)
- Backend: Express MVC pattern (/models /controllers /routes /middleware)
- DB: MongoDB with Mongoose
- Auth: JWT (access token in memory, refresh token httpOnly cookie)
- No CSS frameworks — custom variables in /frontend/src/styles/variables.css

## Environment

- Run: docker-compose up
- Frontend dev: cd frontend && ng serve
- Backend dev: cd backend && npm run dev (nodemon)
- MongoDB: localhost:27017, db name: markethub

## Code conventions

- Angular: standalone components, signals for state when possible
- Backend: async/await, no callbacks, errors via next(err)
- All API routes prefixed with /api/v1
- TypeScript strict mode on

ALWAYS REMEMBER THE USER TO COMMIT CHANGES ONCE A FEATURE IS COMPLETED.
