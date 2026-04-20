# PROMPT — Fase 3, Part 5: API Temes de Discussió + Perfils + Seguidors + Cerca

Read `CLAUDE.md` at the project root, `/backend/CLAUDE.md` and `/COMMUNITY.md`
fully before writing any code.

**Current task:** Build the API for discussion topics (PostReddit), public user profiles,
the following system, and the general search. These are four independent features grouped
together because none of them is complex enough to warrant its own prompt.

---

## Part A — Discussion Topics API

### Context (from COMMUNITY.md)

- Discussion topics are fixed and hardcoded. They are never created or deleted via API.
- Posts inside topics use PostReddit format: title (max 300 chars) + text (max 2000 chars)
  - optional image or video.
- Voting: users can upvote OR downvote independently. Voting the opposite removes the
  previous vote. A user cannot have both an upvote and a downvote on the same post.
- Displayed score = upvotes.length - downvotes.length (net score).
- Feed ordering: by net vote score (default) or by most recent.
- PostReddit posts NEVER appear in the general feed and are NOT shown on user profiles.
- Comments on PostReddit posts do NOT have likes (postType check handles this already
  in the existing comment endpoints).

---

### Create `/backend/controllers/discussionTopicController.js`

---

#### `listTopics`

- Route: `GET /api/v1/topics`
- Auth: optional
- Query params:
  - `category`: optional, filter by category enum value
    ('CORE_MARKETS', 'ECONOMIA_I_MACRO', 'ASSETS_ESPECIFICS', 'TRADING_I_INVERSIO')
  - `search`: optional, case-insensitive partial match on `name`
- Sort by `name` ascending within each category
- Returns:

```javascript
{
  success: true,
  topics: [topic.toPublicJSON(), ...]
}
```

No pagination — there are few enough fixed topics to return all at once.

---

#### `getTopicBySlug`

- Route: `GET /api/v1/topics/:slug`
- Auth: optional
- Fetch DiscussionTopic by `slug` field (not \_id)
- Returns: `{ success: true, topic: topic.toPublicJSON() }`

---

#### `getTopicFeed`

- Route: `GET /api/v1/topics/:slug/feed`
- Auth: optional
- Query params:
  - `sort`: 'top' (default, by net vote score desc) or 'new' (by createdAt desc)
  - `page`: default 1
  - `limit`: default 20, max 50
- Fetch PostReddit posts where `topic` matches the topic's \_id
- Populate `author` with: `username avatar role`
- If `sort === 'top'`:
  - Cannot sort by voteScore directly in MongoDB because it's a virtual field.
  - Use aggregation pipeline:
    ```javascript
    // Add a computed field: voteScore = size(upvotes) - size(downvotes)
    // Sort by voteScore desc, then createdAt desc as tiebreaker
    { $addFields: { voteScore: { $subtract: [{ $size: '$upvotes' }, { $size: '$downvotes' }] } } },
    { $sort: { voteScore: -1, createdAt: -1 } }
    ```
- If `sort === 'new'`: simple sort by `createdAt` descending
- Returns:

```javascript
{
  success: true,
  posts: [post.toPublicJSON(), ...],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

#### `createTopicPost`

- Route: `POST /api/v1/topics/:slug/posts`
- Auth: required
- Accepts: multipart/form-data with `title`, `text?`, and optional `media` file
- Validation:
  - `title` required, max 300 chars
  - `text` optional, max 2000 chars
  - At least one of `title` or `text` must be meaningful content (title alone is enough)
- Create PostReddit with:
  - `author`: req.user.id
  - `title`, `text`, `mediaUrl`, `mediaType`: from body and uploadHandler
  - `topic`: topic.\_id
- Increment `topic.postCount` by 1 and save
- Returns: `{ success: true, post: post.toPublicJSON() }`

---

#### `getPostById`

- Route: `GET /api/v1/topics/:slug/posts/:postId`
- Auth: optional
- Fetch PostReddit by id, verify it belongs to this topic
- Populate `author` with: `username avatar role`
- Returns: `{ success: true, post: post.toPublicJSON() }`

---

#### `votePost`

- Route: `POST /api/v1/topics/:slug/posts/:postId/vote`
- Auth: required
- Body: `{ vote }` — must be 'up' or 'down'
- Logic:

  ```
  If vote === 'up':
    If user is already in upvotes → remove from upvotes (toggle off)
    Else → add to upvotes AND remove from downvotes (if present)

  If vote === 'down':
    If user is already in downvotes → remove from downvotes (toggle off)
    Else → add to downvotes AND remove from upvotes (if present)
  ```

- Returns:

```javascript
{
  success: true,
  upvotes: post.upvotes.length,
  downvotes: post.downvotes.length,
  voteScore: post.upvotes.length - post.downvotes.length,
  userVote: 'up' | 'down' | null  // current state of this user's vote after the action
}
```

---

#### `deleteTopicPost`

- Route: `DELETE /api/v1/topics/:slug/posts/:postId`
- Auth: required
- Rules:
  - Post author can delete their own post
  - Platform moderator (User.role === 'moderator') can delete any post
  - Platform superadmin (User.role === 'superadmin') can delete any post
  - No one else can delete
- If post has mediaUrl, delete the file from disk using `fs.unlink`
- Delete all comments where `postId === post._id` AND `postType === 'PostReddit'`
- Decrement `topic.postCount` by 1 (min 0) and save topic
- Returns: `{ success: true, message: 'Post deleted' }`

---

#### Comments on PostReddit posts

PostReddit comments use the SAME existing comment endpoints:

```
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
DELETE /api/v1/posts/:postId/comments/:commentId
```

The `likeComment` endpoint already rejects likes on PostReddit comments
(postType check). Do NOT create new comment routes for topics.

---

### Create `/backend/routes/topics.js`

```javascript
GET    /                          → listTopics
GET    /:slug                     → getTopicBySlug
GET    /:slug/feed                → getTopicFeed
POST   /:slug/posts               → authMiddleware + uploadHandler + createTopicPost
GET    /:slug/posts/:postId       → getPostById
POST   /:slug/posts/:postId/vote  → authMiddleware + votePost
DELETE /:slug/posts/:postId       → authMiddleware + deleteTopicPost
```

Mount in `/backend/routes/index.js`:

```javascript
router.use("/topics", topicsRouter);
```

---

## Part B — User Profiles & Following API

### Context (from COMMUNITY.md)

- Public profile shows: avatar, coverImage, username, follower count, following count,
  bio, list of public communities the user is a member of, and the user's public PostX posts.
- Public posts = PostX posts with `origin: 'general'` OR `origin: 'public_community'`.
  NEVER shows posts with `origin: 'private_community'` or PostReddit posts.
- Following a user makes their posts appear in the Following feed.
- Following does NOT grant access to private community posts.

---

### Create `/backend/controllers/userController.js`

---

#### `getPublicProfile`

- Route: `GET /api/v1/users/:username`
- Auth: optional
- Fetch user by `username` field (case-insensitive)
- If user not found → return 404: `'User not found'`
- Fetch public communities where `members` contains user.\_id:
  - Query CommunityPublic where `members: user._id`
  - Return only `toPublicJSON()` for each
- If req.user exists, also return whether the requesting user follows this profile:
  `isFollowing: req.user.following.includes(user._id)`
- Returns:

```javascript
{
  success: true,
  user: user.toPublicJSON(),  // includes followingCount, followersCount, coverImage
  communities: [community.toPublicJSON(), ...],
  isFollowing: true/false  // only if req.user exists, otherwise omit
}
```

---

#### `getUserPosts`

- Route: `GET /api/v1/users/:username/posts`
- Auth: optional
- Fetch user by username
- Fetch PostX posts where:
  - `author: user._id`
  - `origin: { $in: ['general', 'public_community'] }`
  - NEVER include `origin: 'private_community'`
- Sort by `createdAt` descending
- Populate `author` with: `username avatar`
- Populate `community` with: `name` (when communityType is set)
- Query params: `page` (default 1), `limit` (default 20, max 50)
- Returns:

```javascript
{
  success: true,
  posts: [post.toPublicJSON(), ...],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

#### `followUser`

- Route: `POST /api/v1/users/:username/follow`
- Auth: required
- Cannot follow yourself → return 400: `'Cannot follow yourself'`
- Fetch target user by username → 404 if not found
- Toggle follow:
  - If req.user already follows target → unfollow:
    - Remove target.\_id from req.user.following
    - Remove req.user.\_id from target.followers
  - If not following → follow:
    - Add target.\_id to req.user.following
    - Add req.user.\_id to target.followers
- Save both users
- Returns:

```javascript
{
  success: true,
  following: true/false,  // current state after the action
  followersCount: target.followers.length
}
```

---

#### `getFollowers`

- Route: `GET /api/v1/users/:username/followers`
- Auth: optional
- Fetch user by username
- Populate `user.followers` with: `username avatar bio`
- Query params: `page` (default 1), `limit` (default 20, max 50)
- Returns:

```javascript
{
  success: true,
  followers: [user.toPublicJSON(), ...],
  pagination: { ... }
}
```

---

#### `getFollowing`

- Route: `GET /api/v1/users/:username/following`
- Auth: optional
- Same as getFollowers but for `user.following`
- Returns:

```javascript
{
  success: true,
  following: [user.toPublicJSON(), ...],
  pagination: { ... }
}
```

---

### Create `/backend/routes/users.js`

```javascript
GET    /:username               → getPublicProfile
GET    /:username/posts         → getUserPosts
POST   /:username/follow        → authMiddleware + followUser
GET    /:username/followers     → getFollowers
GET    /:username/following     → getFollowing
```

Mount in `/backend/routes/index.js`:

```javascript
router.use("/users", usersRouter);
```

---

## Part C — General Search API

### Context (from COMMUNITY.md)

General search covers: users, PostX posts (general + public communities only),
public communities and private communities (name only, not content).
Does NOT search: PostReddit posts, discussion topics (those have their own search).

---

### Create `/backend/controllers/searchController.js`

---

#### `search`

- Route: `GET /api/v1/search`
- Auth: optional
- Query params:
  - `q`: required, search string, min 2 chars. Return 400 if shorter.
  - `type`: optional, filter by 'users', 'posts', or 'communities'.
    If omitted, search all three types.
  - `page`: default 1
  - `limit`: default 20, max 50 (applied per type)

Run searches in parallel using `Promise.all` for efficiency.

**Users search** (if type is 'users' or not specified):

- Match `username` case-insensitive partial: `{ username: { $regex: q, $options: 'i' } }`
- Return `toPublicJSON()` for each result

**Posts search** (if type is 'posts' or not specified):

- Match PostX posts where `text` contains query (case-insensitive)
  AND `origin: { $in: ['general', 'public_community'] }`
  NEVER include `origin: 'private_community'`
- Populate `author` with: `username avatar`
- Populate `community` with: `name`
- Return `toPublicJSON()` for each result

**Communities search** (if type is 'communities' or not specified):

- Search both CommunityPublic and CommunityPrivate
- Match `name` case-insensitive partial
- For CommunityPrivate: return `toPublicJSON()` only (name, description, memberCount)
  — do NOT expose any member list or content
- Merge and sort results by memberCount descending

- Returns:

```javascript
{
  success: true,
  query: q,
  results: {
    users: {
      items: [user.toPublicJSON(), ...],
      total: number
    },
    posts: {
      items: [post.toPublicJSON(), ...],
      total: number
    },
    communities: {
      items: [community.toPublicJSON(), ...],
      total: number
    }
  }
}
```

If `type` is specified, only the relevant key is included in `results`.

---

### Create `/backend/routes/search.js`

```javascript
GET /    → search
```

Mount in `/backend/routes/index.js`:

```javascript
router.use("/search", searchRouter);
```

---

## When done — Full test suite

### Part A: Discussion Topics

**Topics listing:**

- `GET /api/v1/topics` → confirm all seeded topics are returned
- `GET /api/v1/topics?category=CORE_MARKETS` → confirm only core markets topics
- `GET /api/v1/topics?search=crypto` → confirm filtered results
- `GET /api/v1/topics/crypto` → confirm topic returned by slug

**Post creation and feed:**

- `POST /api/v1/topics/crypto/posts` with title only → confirm success
- `POST /api/v1/topics/crypto/posts` with title + text + image → confirm mediaUrl set
- `POST /api/v1/topics/crypto/posts` without title → confirm 400 error
- `GET /api/v1/topics/crypto/feed` → confirm posts returned sorted by net score
- `GET /api/v1/topics/crypto/feed?sort=new` → confirm sorted by createdAt

**Voting:**

- Upvote a post → confirm `{ upvotes: 1, downvotes: 0, voteScore: 1, userVote: 'up' }`
- Upvote same post again → confirm toggle off: `{ upvotes: 0, voteScore: 0, userVote: null }`
- Upvote then downvote → confirm upvotes: 0, downvotes: 1, voteScore: -1, userVote: 'down'
- Downvote then upvote → confirm downvotes: 0, upvotes: 1, voteScore: 1, userVote: 'up'
- Try to like a comment on a PostReddit post → confirm the existing endpoint rejects it

**Deletion:**

- Delete own post → confirm success and file removed from disk
- Try to delete another user's post → confirm 403
- Delete as platform moderator → confirm success
- Confirm all comments of the deleted post are also deleted

---

### Part B: User Profiles & Following

**Public profile:**

- `GET /api/v1/users/testuser` → confirm returns avatar, bio, followingCount, followersCount, coverImage, communities
- `GET /api/v1/users/nonexistent` → confirm 404
- Request as authenticated user → confirm `isFollowing` field is present
- Request as unauthenticated → confirm `isFollowing` is absent

**User posts:**

- `GET /api/v1/users/testuser/posts` → confirm only PostX posts with origin 'general' or 'public_community'
- Create a post in a private community as testuser → confirm it does NOT appear in `GET /api/v1/users/testuser/posts`
- Create a PostReddit post as testuser → confirm it does NOT appear in user posts

**Following:**

- Follow a user → confirm `{ following: true, followersCount: 1 }`
- Follow same user again → confirm toggle off: `{ following: false, followersCount: 0 }`
- Try to follow yourself → confirm 400 error
- Follow a user → `GET /api/v1/posts/feed?mode=following` → confirm their posts appear
- Unfollow → confirm their posts no longer appear in following feed
- `GET /api/v1/users/testuser/followers` → confirm paginated list
- `GET /api/v1/users/testuser/following` → confirm paginated list

---

### Part C: Search

**Basic search:**

- `GET /api/v1/search?q=a` → confirm 400 (too short)
- `GET /api/v1/search?q=test` → confirm results for users, posts and communities

**Users search:**

- Create user with username 'financeguru' → `GET /api/v1/search?q=finance&type=users` → confirm appears
- `GET /api/v1/search?q=finance&type=posts` → confirm users key is absent in results

**Posts search:**

- Create a general post with text 'Bitcoin analysis' → search for 'bitcoin' → confirm appears
- Create a private community post with same text → confirm it does NOT appear in search
- Create a PostReddit post with same text → confirm it does NOT appear in search

**Communities search:**

- `GET /api/v1/search?q=crypto&type=communities` → confirm both public and private communities match
- Confirm private community results only show toPublicJSON() (no members list, no posts)

---

## Update `/backend/CLAUDE.md` when done

```
## API routes done (add these)

### Discussion Topics
- GET    /api/v1/topics (public, supports ?category&search)
- GET    /api/v1/topics/:slug (public)
- GET    /api/v1/topics/:slug/feed (public, supports ?sort=top|new&page&limit)
- POST   /api/v1/topics/:slug/posts (protected, multipart)
- GET    /api/v1/topics/:slug/posts/:postId (public)
- POST   /api/v1/topics/:slug/posts/:postId/vote (protected)
- DELETE /api/v1/topics/:slug/posts/:postId (protected)

### Users & Following
- GET    /api/v1/users/:username (public)
- GET    /api/v1/users/:username/posts (public)
- POST   /api/v1/users/:username/follow (protected, toggle)
- GET    /api/v1/users/:username/followers (public)
- GET    /api/v1/users/:username/following (public)

### Search
- GET    /api/v1/search (public, supports ?q&type=users|posts|communities&page&limit)
```
