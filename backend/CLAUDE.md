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

## API routes done
- GET  /api/v1/health
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
- GET  /api/v1/auth/me (protected)
- PUT  /api/v1/profile (protected)
- PUT  /api/v1/profile/password (protected)

## Running

- Docker: `docker-compose up` (from project root)
- Local: `npm run dev` (requires MongoDB running on localhost:27017)

## Docker

- Dockerfile: Node 20 Alpine, `npm run dev`
- Volume mount `./backend:/app` for live reload
- Connects to mongo service via `mongodb://mongo:27017/markethub`

## Models done
- User: updated with following, followers, coverImage
- PostX: Twitter/X style post for general feed and communities (max 400 chars)
- PostReddit: Reddit style post for discussion topics only (title + text + votes)
- Comment: shared by both post types, supports one nesting level, likes only on PostX comments
- CommunityPublic: no roles, auto-delete when empty
- CommunityPrivate: roles (leader, moderator, little_whale, member), join requests (max 150 chars), auto-delete when empty, leader succession logic
- DiscussionTopic: fixed topics, hardcoded via seed, never change

## Current Status

✅ Express scaffold with MVC structure
✅ MongoDB connection (Mongoose)
✅ Global error handler middleware
✅ Health check endpoint
✅ Docker containerized

## Rules

- UPDATE THIS FILE AFTER EVERY SUCCESSFULLY IMPLEMENTED FEATURE OR FUNCTION.
