# PROMPT — Fase 3, Part 2: File Upload + General Feed API

Read `CLAUDE.md` at the project root, `/backend/CLAUDE.md` and `/COMMUNITY.md`
fully before writing any code.

**Current task:** Set up file upload infrastructure with multer, then build the
general feed API and all PostX post endpoints. This covers the general feed only
(origin: 'general'). Community posts are handled in later prompts.

---

## Part A — File Upload Infrastructure

### Install dependencies

```
multer
uuid
```

### Create `/backend/config/upload.js`

This is the central multer configuration used by all routes that accept file uploads.

```javascript
// Storage: save files to /backend/uploads/ folder
// Subfolder by type: /backend/uploads/images/ and /backend/uploads/videos/
// Filename: uuid + original extension to avoid collisions
// Allowed image types: image/jpeg, image/png, image/gif, image/webp
// Allowed video types: video/mp4, video/webm, video/quicktime
// Max file size: 10MB for images, 100MB for videos
// If file type is not allowed, return error: { success: false, message: 'File type not allowed', code: 400 }
```

Export two multer instances:

- `uploadImage` → accepts single file, field name: 'media', images only
- `uploadVideo` → accepts single file, field name: 'media', videos only
- `uploadMedia` → accepts single file, field name: 'media', both images and videos

### Create `/backend/uploads/` folder structure

```
backend/uploads/
├── images/     → uploaded images
└── videos/     → uploaded videos
```

Add `/backend/uploads/` to `/backend/.gitignore` except for the empty folders.
Create a `.gitkeep` file inside each subfolder so Git tracks the folders.

### Serve static files

In `server.js`, add:

```javascript
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
```

This makes uploaded files accessible at:
`http://localhost:3000/uploads/images/filename.jpg`
`http://localhost:3000/uploads/videos/filename.mp4`

### Create `/backend/middleware/uploadHandler.js`

A wrapper middleware that:

- Runs multer upload
- If multer throws an error (file too large, wrong type), catches it and
  calls next(err) with a formatted error instead of crashing
- Sets `req.mediaUrl` and `req.mediaType` based on the uploaded file:
  - If file uploaded: `req.mediaUrl = '/uploads/images/filename.jpg'`,
    `req.mediaType = 'image'` or `'video'`
  - If no file uploaded: `req.mediaUrl = ''`, `req.mediaType = 'none'`

---

## Part B — General Feed API

### Create `/backend/controllers/postXController.js`

All controller functions use async/await and pass errors to next(err).

---

#### `createPost`

- Route: `POST /api/v1/posts`
- Auth: required
- Accepts: multipart/form-data with fields `text` and optional `media` file
- Validation:
  - `text` is required, max 400 chars
  - If text exceeds 400 chars return 400 error
- Creates a PostX with:
  - `author`: req.user.id
  - `text`: req.body.text
  - `mediaUrl`: req.mediaUrl (from uploadHandler)
  - `mediaType`: req.mediaType (from uploadHandler)
  - `origin`: 'general'
  - `community`: null
  - `communityType`: null
- Returns: `{ success: true, post: post.toPublicJSON() }`

---

#### `getFeed`

- Route: `GET /api/v1/posts/feed`
- Auth: optional (public route)
- Query params:
  - `mode`: 'trending' (default) or 'following'
  - `page`: number, default 1
  - `limit`: number, default 20, max 50
- If `mode === 'following'`:
  - Requires auth. If not authenticated return 401.
  - Fetch posts where `author` is in `req.user.following` AND
    `origin` is 'general' or 'public_community'
  - Never include posts with `origin: 'private_community'`
  - Sort by `createdAt` descending
- If `mode === 'trending'` (default, public):
  - Fetch posts where `origin` is 'general' or 'public_community'
  - Never include posts with `origin: 'private_community'`
  - Sort by `trendingScore` descending, then `createdAt` descending as tiebreaker
- Populate `author` with: `username avatar role`
- Populate `community` with: `name` (only when communityType is set)
- Apply pagination with `page` and `limit`
- Returns:

```javascript
{
  success: true,
  posts: [post.toPublicJSON(), ...],
  pagination: {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage
  }
}
```

---

#### `getPostById`

- Route: `GET /api/v1/posts/:id`
- Auth: optional
- Fetch PostX by id
- Populate `author` with: `username avatar role`
- If post has `origin: 'private_community'`, return 403 unless:
  - req.user exists AND is a member of that community (check via CommunityPrivate)
- Returns: `{ success: true, post: post.toPublicJSON() }`

---

#### `likePost`

- Route: `POST /api/v1/posts/:id/like`
- Auth: required
- Toggle like:
  - If user already liked → remove from likes array (unlike)
  - If user has not liked → add to likes array (like)
- Recalculate and update `trendingScore` using `PostX.calculateTrendingScore(post)`
- Returns: `{ success: true, liked: true/false, likesCount: post.likes.length }`

---

#### `deletePost`

- Route: `DELETE /api/v1/posts/:id`
- Auth: required
- Rules:
  - Author can always delete their own post
  - Platform moderator (User.role === 'moderator') can delete any PostX
  - Platform superadmin (User.role === 'superadmin') can delete any PostX
  - No one else can delete
- If post has a mediaUrl, delete the file from disk using `fs.unlink`
- Decrement `commentCount` tracking is not needed here (comments are cascade-deleted)
- Delete all comments where `postId === post._id` AND `postType === 'PostX'`
- Returns: `{ success: true, message: 'Post deleted' }`

---

#### `getComments`

- Route: `GET /api/v1/posts/:id/comments`
- Auth: optional
- Fetch all comments where `postId === id` AND `postType === 'PostX'`
  AND `parentComment === null` (top-level comments only)
- Populate `author` with: `username avatar`
- Populate `replyingTo` with: `username`
- For each top-level comment, also fetch its replies:
  - Find comments where `parentComment === comment._id`
  - Populate `author` and `replyingTo` the same way
  - Sort replies by `createdAt` ascending
- Sort top-level comments by `createdAt` ascending
- Returns:

```javascript
{
  success: true,
  comments: [
    {
      ...comment.toPublicJSON(),
      replies: [comment.toPublicJSON(), ...]
    }
  ]
}
```

---

#### `createComment`

- Route: `POST /api/v1/posts/:id/comments`
- Auth: required
- Body: `{ text, parentCommentId? }`
- Validation: `text` required, max 400 chars
- If `parentCommentId` is provided:
  - Fetch the parent comment
  - If not found return 404
  - If parent comment already has a parent (depth > 1) return 400 error:
    `'Cannot reply to a reply'`
  - Set `parentComment: parentCommentId`
  - Set `replyingTo: parentComment.author`
- Create comment with `postType: 'PostX'`
- Increment `post.commentCount` by 1 and save post
- Recalculate and update post `trendingScore`
- Returns: `{ success: true, comment: comment.toPublicJSON() }`

---

#### `likeComment`

- Route: `POST /api/v1/posts/:postId/comments/:commentId/like`
- Auth: required
- Only works for comments with `postType: 'PostX'`
- Toggle like on the comment (same logic as likePost)
- Returns: `{ success: true, liked: true/false, likesCount: comment.likes.length }`

---

#### `deleteComment`

- Route: `DELETE /api/v1/posts/:postId/comments/:commentId`
- Auth: required
- Rules:
  - Author can delete their own comment
  - Platform moderator or superadmin can delete any comment
  - Community moderator/leader can delete comments in their community's posts
    (handle this in community-specific routes later, not here)
- If comment has replies, delete the replies too
- Decrement `post.commentCount` by the number of deleted comments (comment + replies)
- Returns: `{ success: true, message: 'Comment deleted' }`

---

### Trending score recalculation job

Create `/backend/jobs/updateTrendingScores.js`:

- Exports a function `updateTrendingScores()`
- Fetches all PostX documents
- For each post, calls `PostX.calculateTrendingScore(post)` and updates `trendingScore`
- Uses `bulkWrite` for efficiency, not individual saves
- Logs how many posts were updated

In `server.js`, schedule this job to run every 30 minutes using `setInterval`:

```javascript
const { updateTrendingScores } = require("./jobs/updateTrendingScores");
// Run once on startup, then every 30 minutes
updateTrendingScores();
setInterval(updateTrendingScores, 30 * 60 * 1000);
```

---

### Create `/backend/routes/posts.js`

Mount all PostX routes. Apply `authMiddleware` only where required (marked above).
Apply `uploadHandler` middleware before `createPost`.

```javascript
POST   /                          → uploadHandler + createPost
GET    /feed                      → getFeed
GET    /:id                       → getPostById
POST   /:id/like                  → authMiddleware + likePost
DELETE /:id                       → authMiddleware + deletePost
GET    /:id/comments              → getComments
POST   /:id/comments              → authMiddleware + createComment
POST   /:postId/comments/:commentId/like → authMiddleware + likeComment
DELETE /:postId/comments/:commentId      → authMiddleware + deleteComment
```

Mount in `/backend/routes/index.js`:

```javascript
router.use("/posts", postsRouter);
```

---

## When done

1. Test file upload: `POST /api/v1/posts` with multipart/form-data containing
   text and an image file. Confirm the file appears in `/backend/uploads/images/`
   and the response contains the correct `mediaUrl`.

2. Test feed: `GET /api/v1/posts/feed` returns empty array (no posts yet is fine).

3. Test full flow with Postman or curl:
   - Create a post with text only
   - Create a post with an image
   - Like the post → confirm liked: true
   - Like again → confirm liked: false (toggle)
   - Comment on the post → confirm commentCount increments
   - Reply to the comment → confirm replyingTo is set
   - Try to reply to a reply → confirm 400 error
   - Delete the post → confirm file is removed from disk

4. Update `/backend/CLAUDE.md`:

```
## API routes done
- GET  /api/v1/health
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
- GET  /api/v1/auth/me (protected)
- PUT  /api/v1/profile (protected)
- PUT  /api/v1/profile/password (protected)
- POST /api/v1/posts (protected, multipart)
- GET  /api/v1/posts/feed (public, supports ?mode=trending|following&page&limit)
- GET  /api/v1/posts/:id (public)
- POST /api/v1/posts/:id/like (protected)
- DELETE /api/v1/posts/:id (protected)
- GET  /api/v1/posts/:id/comments (public)
- POST /api/v1/posts/:id/comments (protected)
- POST /api/v1/posts/:postId/comments/:commentId/like (protected)
- DELETE /api/v1/posts/:postId/comments/:commentId (protected)

## Infrastructure
- multer configured in /backend/config/upload.js
- uploaded files served at /uploads/images/ and /uploads/videos/
- trending score job runs every 30 minutes via setInterval in server.js
```
