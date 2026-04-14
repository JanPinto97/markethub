# MarketHub — Backend

## Overview

Express REST API serving the MarketHub frontend. Runs on port 3000.

## Structure

```
/config
  db.js              → MongoDB connection via Mongoose
/controllers         → (empty — ready for feature controllers)
/middleware
  error.js           → Global error handler: { success: false, message, code }
/models              → (empty — ready for Mongoose schemas)
/routes
  index.js           → Route index, mounts all sub-routes under /api/v1
server.js            → Entry point: loads env, connects DB, starts Express
```

## Tech Stack

- Node.js 20 (Alpine in Docker)
- Express 5
- Mongoose 9 (MongoDB 7)
- nodemon for dev hot-reload
- dotenv for environment variables (loaded from root /.env)

## API Conventions

- All routes prefixed with `/api/v1`
- async/await everywhere, no callbacks
- Errors propagated via `next(err)`, caught by global error middleware
- Response format:
  - Success: `{ success: true, ... }`
  - Error: `{ success: false, message: "...", code: 500 }`

## Available Endpoints

- `GET /api/v1/health` → `{ success: true, message: "Backend running" }`

## Running

- Docker: `docker-compose up` (from project root)
- Local: `npm run dev` (requires MongoDB running on localhost:27017)

## Docker

- Dockerfile: Node 20 Alpine, `npm run dev`
- Volume mount `./backend:/app` for live reload
- Connects to mongo service via `mongodb://mongo:27017/markethub`

## Models done
- User: username, email, passwordHash, role, avatar, bio, loginAttempts, lockUntil, createdAt

## Current Status

✅ Express scaffold with MVC structure
✅ MongoDB connection (Mongoose)
✅ Global error handler middleware
✅ Health check endpoint
✅ Docker containerized

## Rules

- UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION.
