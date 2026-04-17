# PROMPT — Fase 3, Part 3: API Comunitats Públiques

Read `CLAUDE.md` at the project root, `/backend/CLAUDE.md` and `/COMMUNITY.md`
fully before writing any code.

**Current task:** Build the full API for public communities. File upload infrastructure
(multer, uploadHandler) and PostX post/comment endpoints already exist and must be reused.

---

## Context: Public Community rules (from COMMUNITY.md)

- Any authenticated user can join directly, no approval needed.
- No roles exist. All members are equal.
- No moderation. Nobody can delete posts inside a public community except
  the post's own author, or a platform moderator/superadmin.
- Posts from public communities appear in the general feed Trending mode
  with a community label. They must have `origin: 'public_community'`.
- A public community cannot be converted to private. Ever.
- When the last member leaves, the community is deleted automatically and silently.
- The auto-delete post-save hook already exists in CommunityPublic model.

---

## Create `/backend/controllers/communityPublicController.js`

All functions use async/await and pass errors to next(err).

---

### `createCommunity`

- Route: `POST /api/v1/communities/public`
- Auth: required
- Body: `{ name, description?, avatar? }` (multipart/form-data, avatar is optional file upload)
- Validation:
  - `name` required, 3–50 chars
  - `name` must be unique across BOTH CommunityPublic and CommunityPrivate.
    Check both collections before creating. If taken, return 409:
    `'Community name already taken'`
  - `description` max 300 chars
- Create community with:
  - `name`, `description`, `avatar` (from uploadHandler if file uploaded, else '')
  - `members`: [] — creator is NOT automatically added as member and has no special role.
    The creator can join like any other user after creation if they want.
- Returns: `{ success: true, community: community.toPublicJSON() }`

---

### `getCommunity`

- Route: `GET /api/v1/communities/public/:id`
- Auth: optional
- Fetch CommunityPublic by id
- Populate nothing (toPublicJSON is enough)
- Returns: `{ success: true, community: community.toPublicJSON() }`

---

### `joinCommunity`

- Route: `POST /api/v1/communities/public/:id/join`
- Auth: required
- Check if user is already a member → return 400: `'Already a member'`
- Add `req.user.id` to `community.members`
- Save community (post-save hook will NOT trigger auto-delete since we are adding, not removing)
- Returns: `{ success: true, message: 'Joined community', memberCount: community.members.length }`

---

### `leaveCommunity`

- Route: `POST /api/v1/communities/public/:id/leave`
- Auth: required
- Check if user is a member → return 400: `'Not a member'`
- Remove `req.user.id` from `community.members`
- Save community
- The post-save hook on CommunityPublic will automatically delete the community
  if members.length === 0 after saving. No extra logic needed here.
- If the community still exists after save:
  Returns: `{ success: true, message: 'Left community' }`
- If the community was deleted (catch the case where it no longer exists):
  Returns: `{ success: true, message: 'Left community. Community deleted as it had no members.' }`

---

### `getCommunityFeed`

- Route: `GET /api/v1/communities/public/:id/feed`
- Auth: optional
- Query params: `page` (default 1), `limit` (default 20, max 50)
- Fetch PostX posts where:
  - `origin: 'public_community'`
  - `community: id`
  - `communityType: 'public'`
- Sort by `trendingScore` descending, then `createdAt` descending as tiebreaker
- Populate `author` with: `username avatar role`
- Returns:

```javascript
{
  success: true,
  posts: [post.toPublicJSON(), ...],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

### `createCommunityPost`

- Route: `POST /api/v1/communities/public/:id/posts`
- Auth: required
- User must be a member of the community → return 403 if not: `'You must be a member to post'`
- Accepts: multipart/form-data with fields `text` and optional `media` file
- Validation: `text` required, max 400 chars
- Create PostX with:
  - `author`: req.user.id
  - `text`: req.body.text
  - `mediaUrl`, `mediaType`: from uploadHandler
  - `origin`: 'public_community'
  - `community`: community.\_id
  - `communityType`: 'public'
- Increment `community.postCount` by 1 and save
- Returns: `{ success: true, post: post.toPublicJSON() }`

---

### `deleteCommunityPost`

- Route: `DELETE /api/v1/communities/public/:id/posts/:postId`
- Auth: required
- Fetch the post and verify it belongs to this community
- Rules:
  - Post author can delete their own post
  - Platform moderator (User.role === 'moderator') can delete any post
  - Platform superadmin (User.role === 'superadmin') can delete any post
  - No one else can delete (public communities have no community-level moderation)
- If post has mediaUrl, delete the file from disk using `fs.unlink`
- Delete all comments where `postId === post._id` AND `postType === 'PostX'`
- Decrement `community.postCount` by 1 (min 0) and save
- Returns: `{ success: true, message: 'Post deleted' }`

---

### `listCommunities`

- Route: `GET /api/v1/communities/public`
- Auth: optional
- Query params:
  - `search`: string, optional — filter by name (case-insensitive partial match)
  - `page`: default 1
  - `limit`: default 20, max 50
- Sort by `members.length` descending (most popular first)
- Returns:

```javascript
{
  success: true,
  communities: [community.toPublicJSON(), ...],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

## Create `/backend/routes/communitiesPublic.js`

```javascript
GET    /                    → listCommunities
POST   /                    → authMiddleware + uploadHandler + createCommunity
GET    /:id                 → getCommunity
POST   /:id/join            → authMiddleware + joinCommunity
POST   /:id/leave           → authMiddleware + leaveCommunity
GET    /:id/feed            → getCommunityFeed
POST   /:id/posts           → authMiddleware + uploadHandler + createCommunityPost
DELETE /:id/posts/:postId   → authMiddleware + deleteCommunityPost
```

Mount in `/backend/routes/index.js`:

```javascript
router.use("/communities/public", communitiesPublicRouter);
```

---

## Important: comments on community posts

Comments on PostX posts inside public communities use the SAME comment endpoints
already built in Part 2:

```
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
POST   /api/v1/posts/:postId/comments/:commentId/like
DELETE /api/v1/posts/:postId/comments/:commentId
```

Do NOT create new comment routes for communities. The existing ones already
handle all PostX comments regardless of origin.

---

## When done

1. Test full flow with Postman or curl:
   - Create a public community (with and without avatar)
   - Join the community as a different user
   - Create a post inside the community
   - Confirm the post appears in `GET /api/v1/posts/feed` (general feed, trending mode)
     with `communityType: 'public'` and community name populated
   - Comment on the community post using the existing `/posts/:id/comments` endpoint
   - Leave the community as the only member → confirm community is auto-deleted
   - Try to create a community with a duplicate name → confirm 409 error

2. Update `/backend/CLAUDE.md` — API routes done section:

```
## API routes done (add these)
- GET    /api/v1/communities/public (public, supports ?search&page&limit)
- POST   /api/v1/communities/public (protected, multipart)
- GET    /api/v1/communities/public/:id (public)
- POST   /api/v1/communities/public/:id/join (protected)
- POST   /api/v1/communities/public/:id/leave (protected)
- GET    /api/v1/communities/public/:id/feed (public, supports ?page&limit)
- POST   /api/v1/communities/public/:id/posts (protected, multipart, members only)
- DELETE /api/v1/communities/public/:id/posts/:postId (protected)
```
