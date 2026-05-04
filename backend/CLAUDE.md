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
- PUT  /api/v1/profile (protected) — accepts username, email, avatar, coverImage, bio; 409 on username/email conflict, 400 on validation
- PUT  /api/v1/profile/password (protected)
- POST /api/v1/posts (protected, multipart)
- GET  /api/v1/posts/feed (public, supports ?mode=trending|following&page&limit)
- GET  /api/v1/posts/:id (public)
- POST /api/v1/posts/:id/like (protected)
- DELETE /api/v1/posts/:id (protected)
- GET  /api/v1/posts/:id/comments (public)
- POST /api/v1/posts/:id/comments (protected)
- POST /api/v1/posts/:postId/comments/:commentId/like (protected)
- POST /api/v1/posts/:postId/comments/:commentId/reply (protected)
- POST /api/v1/posts/:postId/comments/:commentId/replies/:replyId/like (protected)
- DELETE /api/v1/posts/:postId/comments/:commentId (protected)
- DELETE /api/v1/posts/:postId/comments/:commentId/replies/:replyId (protected)

- GET    /api/v1/communities/public (public, supports ?search&page&limit)
- POST   /api/v1/communities/public (protected, multipart)
- GET    /api/v1/communities/public/:id (public)
- POST   /api/v1/communities/public/:id/join (protected)
- POST   /api/v1/communities/public/:id/leave (protected)
- GET    /api/v1/communities/public/:id/feed (public, supports ?page&limit)
- POST   /api/v1/communities/public/:id/posts (protected, multipart, members only)
- DELETE /api/v1/communities/public/:id/posts/:postId (protected)

- GET    /api/v1/communities/private (public)
- POST   /api/v1/communities/private (protected, multipart)
- GET    /api/v1/communities/private/:id (protected; members get full detail+members+pendingRequests; non-members get limited info+myRequestStatus)
- POST   /api/v1/communities/private/:id/request (protected)
- POST   /api/v1/communities/private/:id/requests/:requestId (protected, leader/moderator)
- DELETE /api/v1/communities/private/:id/members/:userId (protected, leader only)
- PUT    /api/v1/communities/private/:id/members/:userId/role (protected, leader only)
- POST   /api/v1/communities/private/:id/leave (protected)
- DELETE /api/v1/communities/private/:id (protected, leader only)
- GET    /api/v1/communities/private/:id/feed (protected, members only)
- POST   /api/v1/communities/private/:id/posts (protected, members only, multipart)
- DELETE /api/v1/communities/private/:id/posts/:postId (protected)
- POST   /api/v1/communities/private/:id/posts/:postId/pin (protected, leader only)

- GET    /api/v1/communities/my (protected, returns user's public+private communities)
- GET    /api/v1/communities/discover (optionalAuth, supports ?search&sort=popularity|members|new&type=public,private&page&limit)

- GET    /api/v1/topics (public, supports ?category&search&ids filter)
- GET    /api/v1/topics/:slug (public)
- GET    /api/v1/topics/:slug/feed (public, supports ?sort=recent|top&page&limit)
- POST   /api/v1/topics/:slug/posts (protected, multipart)
- GET    /api/v1/topics/:slug/posts/:postId (public)
- POST   /api/v1/topics/:slug/posts/:postId/vote (protected, body: {vote: "up"|"down"|"none"})
- DELETE /api/v1/topics/:slug/posts/:postId (protected)
- GET    /api/v1/topics/:slug/posts/:postId/comments (public, ?page&limit, returns root comments + populated replies, sorted createdAt desc)
- POST   /api/v1/topics/:slug/posts/:postId/comments (protected, body: {text})
- POST   /api/v1/topics/:slug/posts/:postId/comments/:commentId/reply (protected, body: {text}, single nesting level)
- DELETE /api/v1/topics/:slug/posts/:postId/comments/:commentId (protected, author/mod/superadmin, deletes replies too)
- DELETE /api/v1/topics/:slug/posts/:postId/comments/:commentId/replies/:replyId (protected, author/mod/superadmin)

- GET    /api/v1/users/:username (public, optionalAuth for isFollowing)
- GET    /api/v1/users/:username/posts (public, supports ?page&limit)
- POST   /api/v1/users/:username/follow (protected, toggle)
- GET    /api/v1/users/:username/followers (public, supports ?page&limit)
- GET    /api/v1/users/:username/following (public, supports ?page&limit)

- GET    /api/v1/search (public, supports ?q&type=users|posts|communities&limit)

## Infrastructure
- multer configured in /backend/config/upload.js
- uploaded files served at /uploads/images/ and /uploads/videos/
- trending score job runs every 30 minutes via setInterval in server.js

## Running

- Docker: `docker-compose up` (from project root)
- Local: `npm run dev` (requires MongoDB running on localhost:27017)

## Docker

- Dockerfile: Node 20 Alpine, `npm run dev`
- Volume mount `./backend:/app` for live reload
- Connects to mongo service via `mongodb://mongo:27017/markethub`

## Models done
- User: updated with following, followers, coverImage. `toPublicJSON()` omits email; `toPrivateJSON()` adds email for own-data endpoints (auth/me, register, login, profile update)
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
