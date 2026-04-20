# PROMPT — Fase 3, Part 4: API Comunitats Privades

Read `CLAUDE.md` at the project root, `/backend/CLAUDE.md` and `/COMMUNITY.md`
fully before writing any code.

**Current task:** Build the full API for private communities. This is the most complex
part of the project. Read COMMUNITY.md carefully before writing any code — all business
rules for roles, succession, feed scoring and join requests are defined there.

---

## Context: Private Community rules (from COMMUNITY.md)

**Roles and their powers:**

| Role         | Powers                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Leader       | Accept/reject join requests, expel members, promote members to any role, delete any post, pin/unpin posts, delete the community |
| Moderator    | Accept/reject join requests, delete any post                                                                                    |
| Little Whale | Feed positioning bonus only                                                                                                     |
| Member       | No special powers                                                                                                               |

**Role constraints:**

- Leader: exactly 1 at all times. Cannot be removed unless they leave.
- Moderator, Little Whale, Member: multiple allowed.

**Leader succession when leader leaves:**

1. Random moderator → promoted to leader
2. If none, random little_whale → promoted to leader
3. If none, random member → promoted to leader
4. If no members at all → community is deleted automatically (post-save hook handles this)

**Feed trending score for private communities:**

- Base score: (likes × 1) + (commentCount × 2) with time decay (same as general feed)
- Role bonus added on top:
  - Leader posts: +50
  - Moderator posts: +20
  - Little Whale posts: +10
  - Member posts: +0
- The role bonus is added when calculating the feed, NOT stored in trendingScore field.
  trendingScore on PostX stores the base score only (calculated by the existing job).
  The role bonus is applied at query time when sorting the private community feed.

**Post visibility:**

- Posts from private communities NEVER appear in the general feed.
- Posts from private communities are NOT visible on the author's public profile.
- Only members of the community can see its posts.

**Join requests:**

- Message max 150 chars.
- Status: pending → accepted or rejected by leader or moderator.
- Accepted users are added as members with role 'member'.

**Auto-deletion:**

- When members.length === 0 after a save, the post-save hook deletes the community.
- This is already implemented in CommunityPrivate model.

---

## Create `/backend/controllers/communityPrivateController.js`

All functions use async/await and pass errors to next(err).

**Helper function** (define at the top of the controller, not exported):

```javascript
// Returns the role of req.user in the community, or null if not a member
function getUserRole(community, userId) {
  const member = community.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  return member ? member.role : null;
}
```

---

### `createCommunity`

- Route: `POST /api/v1/communities/private`
- Auth: required
- Body: multipart/form-data with `name`, `description?`, `avatar?` (optional file)
- Validation:
  - `name` required, 3–50 chars
  - `name` must be unique across BOTH CommunityPublic and CommunityPrivate.
    Check both collections. If taken, return 409: `'Community name already taken'`
  - `description` max 300 chars
- Create community with:
  - `name`, `description`, `avatar` (from uploadHandler or '')
  - `members`: [{ user: req.user.id, role: 'leader' }]
    The creator is automatically added as the leader.
- Returns: `{ success: true, community: community.toPublicJSON() }`

---

### `getCommunity`

- Route: `GET /api/v1/communities/private/:id`
- Auth: required — only members can access any data about a private community
- Check if req.user is a member using `community.isMember(req.user.id)`
- If not a member: return 403: `'This is a private community'`
- Get the user's role using `getUserRole(community, req.user.id)`
- Populate `members.user` with: `username avatar`
- Populate `pinnedPosts` with: `text mediaUrl mediaType author createdAt`
  and populate `pinnedPosts.author` with `username avatar`
- Response depends on role:
  - If role is 'leader' or 'moderator':
    Returns: `{ success: true, community: community.toDetailJSON(), userRole, pendingRequests: joinRequests where status === 'pending' }`
  - If role is 'little_whale' or 'member':
    Returns: `{ success: true, community: community.toDetailJSON(), userRole }`
    (no pendingRequests)

---

### `requestToJoin`

- Route: `POST /api/v1/communities/private/:id/request`
- Auth: required
- Body: `{ message }` — max 150 chars, required
- Check if user is already a member → return 400: `'Already a member'`
- Check if user already has a pending request → return 400: `'Request already pending'`
- Add to `community.joinRequests`:
  `{ user: req.user.id, message, status: 'pending', createdAt: now }`
- Returns: `{ success: true, message: 'Join request sent' }`

---

### `handleJoinRequest`

- Route: `POST /api/v1/communities/private/:id/requests/:requestId`
- Auth: required — leader or moderator only
- Body: `{ action }` — 'accept' or 'reject'
- Check user role → if not leader or moderator, return 403: `'Insufficient permissions'`
- Find the join request by requestId in `community.joinRequests`
- If not found → return 404: `'Request not found'`
- If request status is not 'pending' → return 400: `'Request already handled'`
- If `action === 'accept'`:
  - Update request status to 'accepted'
  - Add user to `community.members` with role 'member'
- If `action === 'reject'`:
  - Update request status to 'rejected'
- Save community
- Returns: `{ success: true, action, message: 'Request accepted/rejected' }`

---

### `expelMember`

- Route: `DELETE /api/v1/communities/private/:id/members/:userId`
- Auth: required — leader only
- Check user role → if not leader, return 403: `'Only the leader can expel members'`
- Cannot expel yourself → return 400: `'Cannot expel yourself. Leave the community instead.'`
- Cannot expel another leader (there should only be one, but guard anyway)
- Find the target user in members → return 404 if not found: `'Member not found'`
- Remove target user from `community.members`
- Save community (post-save hook handles auto-delete if empty, but leader is still there so it won't trigger)
- Returns: `{ success: true, message: 'Member expelled' }`

---

### `promoteMember`

- Route: `PUT /api/v1/communities/private/:id/members/:userId/role`
- Auth: required — leader only
- Body: `{ role }` — must be one of: 'moderator', 'little_whale', 'member'
  (leader cannot be assigned via this endpoint — succession is automatic)
- Check user role → if not leader, return 403: `'Only the leader can promote members'`
- Cannot promote yourself → return 400
- Find the target user in members → return 404 if not found
- Target cannot already be the leader → return 400
- Update target member's role to the new role
- Save community
- Returns: `{ success: true, message: 'Member role updated', newRole: role }`

---

### `leaveCommunity`

- Route: `POST /api/v1/communities/private/:id/leave`
- Auth: required
- Check if user is a member → return 400 if not: `'Not a member'`
- Get user's current role
- Remove user from `community.members`
- If the leaving user was the leader:
  - Call `community.promoteNewLeader()`
  - If it returns null → community has no members, post-save hook will delete it
  - If it returns a member → log who was promoted (no need to return this in response)
- Save community
- If community still exists:
  Returns: `{ success: true, message: 'Left community' }`
- If community was deleted:
  Returns: `{ success: true, message: 'Left community. Community deleted as it had no members.' }`

---

### `deleteCommunity`

- Route: `DELETE /api/v1/communities/private/:id`
- Auth: required — leader only
- Check user role → if not leader, return 403: `'Only the leader can delete the community'`
- Delete all PostX posts where `community: id` AND `communityType: 'private'`
  - For each post, delete media files from disk if mediaUrl is set
- Delete all comments where postType is 'PostX' and postId is in the deleted posts
- Delete the community document
- Returns: `{ success: true, message: 'Community deleted' }`

---

### `getCommunityFeed`

- Route: `GET /api/v1/communities/private/:id/feed`
- Auth: required — members only
- Query params: `page` (default 1), `limit` (default 20, max 50)
- Check membership → return 403 if not a member
- Fetch PostX posts where:
  - `origin: 'private_community'`
  - `community: id`
  - `communityType: 'private'`
  - `isPinned: false` (pinned posts are handled separately)
- For each post, calculate the effective feed score:
  ```javascript
  // Fetch the author's role in this community
  // effectiveScore = post.trendingScore + community.getRoleWeight(authorRole)
  ```
  To do this efficiently:
  - Fetch all posts and populate `author` with `username avatar role _id`
  - Build a map of { userId → communityRole } from `community.members`
  - For each post, look up the author's community role and add the weight bonus
  - Sort by effectiveScore descending, then createdAt descending
  - Apply pagination manually after sorting (since the bonus is applied in JS, not MongoDB)
    Note: for large communities this is acceptable for now. Document this as a known
    limitation in a code comment.
- Fetch pinned posts separately (already populated in getCommunity, but re-fetch here):
  - `PostX.find({ _id: { $in: community.pinnedPosts } })`
  - Populate author with `username avatar`
  - Pinned posts always appear FIRST, before trending posts
- Returns:

```javascript
{
  success: true,
  pinnedPosts: [post.toPublicJSON(), ...],
  posts: [post.toPublicJSON(), ...], // trending posts with role bonus applied
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

### `createCommunityPost`

- Route: `POST /api/v1/communities/private/:id/posts`
- Auth: required — members only
- Check membership → return 403 if not a member: `'You must be a member to post'`
- Accepts: multipart/form-data with `text` and optional `media` file
- Validation: `text` required, max 400 chars
- Create PostX with:
  - `author`: req.user.id
  - `text`, `mediaUrl`, `mediaType`: from body and uploadHandler
  - `origin`: 'private_community'
  - `community`: community.\_id
  - `communityType`: 'private'
- Increment `community.postCount` by 1 and save
- Returns: `{ success: true, post: post.toPublicJSON() }`

---

### `deleteCommunityPost`

- Route: `DELETE /api/v1/communities/private/:id/posts/:postId`
- Auth: required
- Fetch the post and verify it belongs to this community
- Check permissions:
  - Post author can delete their own post
  - Community leader can delete any post in their community
  - Community moderator can delete any post in their community
  - Platform moderator (User.role === 'moderator') can delete any post
  - Platform superadmin (User.role === 'superadmin') can delete any post
  - Everyone else → return 403
- If post has mediaUrl, delete the file from disk
- Delete all comments where `postId === post._id` AND `postType === 'PostX'`
- If post was pinned, remove it from `community.pinnedPosts`
- Decrement `community.postCount` by 1 (min 0) and save
- Returns: `{ success: true, message: 'Post deleted' }`

---

### `pinPost`

- Route: `POST /api/v1/communities/private/:id/posts/:postId/pin`
- Auth: required — leader only
- Check user role → if not leader, return 403: `'Only the leader can pin posts'`
- Fetch the post and verify it belongs to this community
- Toggle pin:
  - If post is already in `community.pinnedPosts` → remove it (unpin)
  - If not → add it (pin)
- Update `post.isPinned` accordingly and save post
- Save community
- Returns: `{ success: true, pinned: true/false, message: 'Post pinned/unpinned' }`

---

### `listCommunities`

- Route: `GET /api/v1/communities/private`
- Auth: optional
- Query params:
  - `search`: string, optional — filter by name (case-insensitive partial match)
  - `page`: default 1
  - `limit`: default 20, max 50
- Returns basic info only (toPublicJSON) — content is private but the community
  itself is discoverable in search
- Sort by `members.length` descending
- Returns:

```javascript
{
  success: true,
  communities: [community.toPublicJSON(), ...],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

## Create `/backend/routes/communitiesPrivate.js`

```javascript
GET    /                              → listCommunities
POST   /                              → authMiddleware + uploadHandler + createCommunity
GET    /:id                           → authMiddleware + getCommunity
POST   /:id/request                   → authMiddleware + requestToJoin
POST   /:id/requests/:requestId       → authMiddleware + handleJoinRequest
DELETE /:id/members/:userId           → authMiddleware + expelMember
PUT    /:id/members/:userId/role      → authMiddleware + promoteMember
POST   /:id/leave                     → authMiddleware + leaveCommunity
DELETE /:id                           → authMiddleware + deleteCommunity
GET    /:id/feed                      → authMiddleware + getCommunityFeed
POST   /:id/posts                     → authMiddleware + uploadHandler + createCommunityPost
DELETE /:id/posts/:postId             → authMiddleware + deleteCommunityPost
POST   /:id/posts/:postId/pin         → authMiddleware + pinPost
```

Mount in `/backend/routes/index.js`:

```javascript
router.use("/communities/private", communitiesPrivateRouter);
```

---

## Important: comments on private community posts

Comments use the same existing endpoints as all other PostX posts:

```
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
POST   /api/v1/posts/:postId/comments/:commentId/like
DELETE /api/v1/posts/:postId/comments/:commentId
```

Do NOT create new comment routes. The existing delete comment endpoint already
handles community moderator/leader permissions via the community membership check.

---

## When done

1. Test full flow with Postman or curl:

   **Community lifecycle:**
   - Create a private community → confirm creator is added as leader
   - Try to GET the community as a non-member → confirm 403
   - Send a join request as another user → confirm pending status
   - Accept the request as leader → confirm user is added as member
   - Reject a request → confirm status changes to rejected
   - Try to send another request from same user → confirm 400 (already member)

   **Role management:**
   - Promote a member to moderator → confirm role change
   - Promote a member to little_whale → confirm role change
   - Try to promote as a non-leader → confirm 403
   - Expel a member as leader → confirm removal
   - Try to expel as a non-leader → confirm 403

   **Leader succession:**
   - Create community, add members with different roles
   - Leave as leader when moderators exist → confirm a moderator becomes leader
   - Leave as leader with only little_whales → confirm a little_whale becomes leader
   - Leave as leader with only base members → confirm a member becomes leader
   - Leave as the only member → confirm community is deleted

   **Feed and posts:**
   - Create posts as leader, moderator, little_whale and member
   - GET /:id/feed → confirm pinned posts appear first
   - Confirm leader posts appear above moderator posts above little_whale posts
   - Pin a post as leader → confirm it appears in pinnedPosts
   - Unpin → confirm it returns to normal feed position
   - Confirm private community posts do NOT appear in GET /api/v1/posts/feed

   **Deletion:**
   - Delete a post as author → confirm success
   - Delete a post as community moderator → confirm success
   - Delete the community as leader → confirm all posts and comments are removed

2. Update `/backend/CLAUDE.md` — API routes done section:

````
## API routes done (add these)
- GET    /api/v1/communities/private (public)
- POST   /api/v1/communities/private (protected, multipart)
- GET    /api/v1/communities/private/:id (protected, members only)
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
```# PROMPT — Fase 3, Part 4: API Comunitats Privades

Read `CLAUDE.md` at the project root, `/backend/CLAUDE.md` and `/COMMUNITY.md`
fully before writing any code.

**Current task:** Build the full API for private communities. This is the most complex
part of the project. Read COMMUNITY.md carefully before writing any code — all business
rules for roles, succession, feed scoring and join requests are defined there.

---

## Context: Private Community rules (from COMMUNITY.md)

**Roles and their powers:**

| Role | Powers |
|------|--------|
| Leader | Accept/reject join requests, expel members, promote members to any role, delete any post, pin/unpin posts, delete the community |
| Moderator | Accept/reject join requests, delete any post |
| Little Whale | Feed positioning bonus only |
| Member | No special powers |

**Role constraints:**
- Leader: exactly 1 at all times. Cannot be removed unless they leave.
- Moderator, Little Whale, Member: multiple allowed.

**Leader succession when leader leaves:**
1. Random moderator → promoted to leader
2. If none, random little_whale → promoted to leader
3. If none, random member → promoted to leader
4. If no members at all → community is deleted automatically (post-save hook handles this)

**Feed trending score for private communities:**
- Base score: (likes × 1) + (commentCount × 2) with time decay (same as general feed)
- Role bonus added on top:
  - Leader posts: +50
  - Moderator posts: +20
  - Little Whale posts: +10
  - Member posts: +0
- The role bonus is added when calculating the feed, NOT stored in trendingScore field.
  trendingScore on PostX stores the base score only (calculated by the existing job).
  The role bonus is applied at query time when sorting the private community feed.

**Post visibility:**
- Posts from private communities NEVER appear in the general feed.
- Posts from private communities are NOT visible on the author's public profile.
- Only members of the community can see its posts.

**Join requests:**
- Message max 150 chars.
- Status: pending → accepted or rejected by leader or moderator.
- Accepted users are added as members with role 'member'.

**Auto-deletion:**
- When members.length === 0 after a save, the post-save hook deletes the community.
- This is already implemented in CommunityPrivate model.

---

## Create `/backend/controllers/communityPrivateController.js`

All functions use async/await and pass errors to next(err).

**Helper function** (define at the top of the controller, not exported):
```javascript
// Returns the role of req.user in the community, or null if not a member
function getUserRole(community, userId) {
  const member = community.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
}
````

---

### `createCommunity`

- Route: `POST /api/v1/communities/private`
- Auth: required
- Body: multipart/form-data with `name`, `description?`, `avatar?` (optional file)
- Validation:
  - `name` required, 3–50 chars
  - `name` must be unique across BOTH CommunityPublic and CommunityPrivate.
    Check both collections. If taken, return 409: `'Community name already taken'`
  - `description` max 300 chars
- Create community with:
  - `name`, `description`, `avatar` (from uploadHandler or '')
  - `members`: [{ user: req.user.id, role: 'leader' }]
    The creator is automatically added as the leader.
- Returns: `{ success: true, community: community.toPublicJSON() }`

---

### `getCommunity`

- Route: `GET /api/v1/communities/private/:id`
- Auth: required — only members can access any data about a private community
- Check if req.user is a member using `community.isMember(req.user.id)`
- If not a member: return 403: `'This is a private community'`
- Get the user's role using `getUserRole(community, req.user.id)`
- Populate `members.user` with: `username avatar`
- Populate `pinnedPosts` with: `text mediaUrl mediaType author createdAt`
  and populate `pinnedPosts.author` with `username avatar`
- Response depends on role:
  - If role is 'leader' or 'moderator':
    Returns: `{ success: true, community: community.toDetailJSON(), userRole, pendingRequests: joinRequests where status === 'pending' }`
  - If role is 'little_whale' or 'member':
    Returns: `{ success: true, community: community.toDetailJSON(), userRole }`
    (no pendingRequests)

---

### `requestToJoin`

- Route: `POST /api/v1/communities/private/:id/request`
- Auth: required
- Body: `{ message }` — max 150 chars, required
- Check if user is already a member → return 400: `'Already a member'`
- Check if user already has a pending request → return 400: `'Request already pending'`
- Add to `community.joinRequests`:
  `{ user: req.user.id, message, status: 'pending', createdAt: now }`
- Returns: `{ success: true, message: 'Join request sent' }`

---

### `handleJoinRequest`

- Route: `POST /api/v1/communities/private/:id/requests/:requestId`
- Auth: required — leader or moderator only
- Body: `{ action }` — 'accept' or 'reject'
- Check user role → if not leader or moderator, return 403: `'Insufficient permissions'`
- Find the join request by requestId in `community.joinRequests`
- If not found → return 404: `'Request not found'`
- If request status is not 'pending' → return 400: `'Request already handled'`
- If `action === 'accept'`:
  - Update request status to 'accepted'
  - Add user to `community.members` with role 'member'
- If `action === 'reject'`:
  - Update request status to 'rejected'
- Save community
- Returns: `{ success: true, action, message: 'Request accepted/rejected' }`

---

### `expelMember`

- Route: `DELETE /api/v1/communities/private/:id/members/:userId`
- Auth: required — leader only
- Check user role → if not leader, return 403: `'Only the leader can expel members'`
- Cannot expel yourself → return 400: `'Cannot expel yourself. Leave the community instead.'`
- Cannot expel another leader (there should only be one, but guard anyway)
- Find the target user in members → return 404 if not found: `'Member not found'`
- Remove target user from `community.members`
- Save community (post-save hook handles auto-delete if empty, but leader is still there so it won't trigger)
- Returns: `{ success: true, message: 'Member expelled' }`

---

### `promoteMember`

- Route: `PUT /api/v1/communities/private/:id/members/:userId/role`
- Auth: required — leader only
- Body: `{ role }` — must be one of: 'moderator', 'little_whale', 'member'
  (leader cannot be assigned via this endpoint — succession is automatic)
- Check user role → if not leader, return 403: `'Only the leader can promote members'`
- Cannot promote yourself → return 400
- Find the target user in members → return 404 if not found
- Target cannot already be the leader → return 400
- Update target member's role to the new role
- Save community
- Returns: `{ success: true, message: 'Member role updated', newRole: role }`

---

### `leaveCommunity`

- Route: `POST /api/v1/communities/private/:id/leave`
- Auth: required
- Check if user is a member → return 400 if not: `'Not a member'`
- Get user's current role
- Remove user from `community.members`
- If the leaving user was the leader:
  - Call `community.promoteNewLeader()`
  - If it returns null → community has no members, post-save hook will delete it
  - If it returns a member → log who was promoted (no need to return this in response)
- Save community
- If community still exists:
  Returns: `{ success: true, message: 'Left community' }`
- If community was deleted:
  Returns: `{ success: true, message: 'Left community. Community deleted as it had no members.' }`

---

### `deleteCommunity`

- Route: `DELETE /api/v1/communities/private/:id`
- Auth: required — leader only
- Check user role → if not leader, return 403: `'Only the leader can delete the community'`
- Delete all PostX posts where `community: id` AND `communityType: 'private'`
  - For each post, delete media files from disk if mediaUrl is set
- Delete all comments where postType is 'PostX' and postId is in the deleted posts
- Delete the community document
- Returns: `{ success: true, message: 'Community deleted' }`

---

### `getCommunityFeed`

- Route: `GET /api/v1/communities/private/:id/feed`
- Auth: required — members only
- Query params: `page` (default 1), `limit` (default 20, max 50)
- Check membership → return 403 if not a member
- Fetch PostX posts where:
  - `origin: 'private_community'`
  - `community: id`
  - `communityType: 'private'`
  - `isPinned: false` (pinned posts are handled separately)
- For each post, calculate the effective feed score:
  ```javascript
  // Fetch the author's role in this community
  // effectiveScore = post.trendingScore + community.getRoleWeight(authorRole)
  ```
  To do this efficiently:
  - Fetch all posts and populate `author` with `username avatar role _id`
  - Build a map of { userId → communityRole } from `community.members`
  - For each post, look up the author's community role and add the weight bonus
  - Sort by effectiveScore descending, then createdAt descending
  - Apply pagination manually after sorting (since the bonus is applied in JS, not MongoDB)
    Note: for large communities this is acceptable for now. Document this as a known
    limitation in a code comment.
- Fetch pinned posts separately (already populated in getCommunity, but re-fetch here):
  - `PostX.find({ _id: { $in: community.pinnedPosts } })`
  - Populate author with `username avatar`
  - Pinned posts always appear FIRST, before trending posts
- Returns:

```javascript
{
  success: true,
  pinnedPosts: [post.toPublicJSON(), ...],
  posts: [post.toPublicJSON(), ...], // trending posts with role bonus applied
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

### `createCommunityPost`

- Route: `POST /api/v1/communities/private/:id/posts`
- Auth: required — members only
- Check membership → return 403 if not a member: `'You must be a member to post'`
- Accepts: multipart/form-data with `text` and optional `media` file
- Validation: `text` required, max 400 chars
- Create PostX with:
  - `author`: req.user.id
  - `text`, `mediaUrl`, `mediaType`: from body and uploadHandler
  - `origin`: 'private_community'
  - `community`: community.\_id
  - `communityType`: 'private'
- Increment `community.postCount` by 1 and save
- Returns: `{ success: true, post: post.toPublicJSON() }`

---

### `deleteCommunityPost`

- Route: `DELETE /api/v1/communities/private/:id/posts/:postId`
- Auth: required
- Fetch the post and verify it belongs to this community
- Check permissions:
  - Post author can delete their own post
  - Community leader can delete any post in their community
  - Community moderator can delete any post in their community
  - Platform moderator (User.role === 'moderator') can delete any post
  - Platform superadmin (User.role === 'superadmin') can delete any post
  - Everyone else → return 403
- If post has mediaUrl, delete the file from disk
- Delete all comments where `postId === post._id` AND `postType === 'PostX'`
- If post was pinned, remove it from `community.pinnedPosts`
- Decrement `community.postCount` by 1 (min 0) and save
- Returns: `{ success: true, message: 'Post deleted' }`

---

### `pinPost`

- Route: `POST /api/v1/communities/private/:id/posts/:postId/pin`
- Auth: required — leader only
- Check user role → if not leader, return 403: `'Only the leader can pin posts'`
- Fetch the post and verify it belongs to this community
- Toggle pin:
  - If post is already in `community.pinnedPosts` → remove it (unpin)
  - If not → add it (pin)
- Update `post.isPinned` accordingly and save post
- Save community
- Returns: `{ success: true, pinned: true/false, message: 'Post pinned/unpinned' }`

---

### `listCommunities`

- Route: `GET /api/v1/communities/private`
- Auth: optional
- Query params:
  - `search`: string, optional — filter by name (case-insensitive partial match)
  - `page`: default 1
  - `limit`: default 20, max 50
- Returns basic info only (toPublicJSON) — content is private but the community
  itself is discoverable in search
- Sort by `members.length` descending
- Returns:

```javascript
{
  success: true,
  communities: [community.toPublicJSON(), ...],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
}
```

---

## Create `/backend/routes/communitiesPrivate.js`

```javascript
GET    /                              → listCommunities
POST   /                              → authMiddleware + uploadHandler + createCommunity
GET    /:id                           → authMiddleware + getCommunity
POST   /:id/request                   → authMiddleware + requestToJoin
POST   /:id/requests/:requestId       → authMiddleware + handleJoinRequest
DELETE /:id/members/:userId           → authMiddleware + expelMember
PUT    /:id/members/:userId/role      → authMiddleware + promoteMember
POST   /:id/leave                     → authMiddleware + leaveCommunity
DELETE /:id                           → authMiddleware + deleteCommunity
GET    /:id/feed                      → authMiddleware + getCommunityFeed
POST   /:id/posts                     → authMiddleware + uploadHandler + createCommunityPost
DELETE /:id/posts/:postId             → authMiddleware + deleteCommunityPost
POST   /:id/posts/:postId/pin         → authMiddleware + pinPost
```

Mount in `/backend/routes/index.js`:

```javascript
router.use("/communities/private", communitiesPrivateRouter);
```

---

## Important: comments on private community posts

Comments use the same existing endpoints as all other PostX posts:

```
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
POST   /api/v1/posts/:postId/comments/:commentId/like
DELETE /api/v1/posts/:postId/comments/:commentId
```

Do NOT create new comment routes. The existing delete comment endpoint already
handles community moderator/leader permissions via the community membership check.

---

## When done

1. Test full flow with Postman or curl:

   **Community lifecycle:**
   - Create a private community → confirm creator is added as leader
   - Try to GET the community as a non-member → confirm 403
   - Send a join request as another user → confirm pending status
   - Accept the request as leader → confirm user is added as member
   - Reject a request → confirm status changes to rejected
   - Try to send another request from same user → confirm 400 (already member)

   **Role management:**
   - Promote a member to moderator → confirm role change
   - Promote a member to little_whale → confirm role change
   - Try to promote as a non-leader → confirm 403
   - Expel a member as leader → confirm removal
   - Try to expel as a non-leader → confirm 403

   **Leader succession:**
   - Create community, add members with different roles
   - Leave as leader when moderators exist → confirm a moderator becomes leader
   - Leave as leader with only little_whales → confirm a little_whale becomes leader
   - Leave as leader with only base members → confirm a member becomes leader
   - Leave as the only member → confirm community is deleted

   **Feed and posts:**
   - Create posts as leader, moderator, little_whale and member
   - GET /:id/feed → confirm pinned posts appear first
   - Confirm leader posts appear above moderator posts above little_whale posts
   - Pin a post as leader → confirm it appears in pinnedPosts
   - Unpin → confirm it returns to normal feed position
   - Confirm private community posts do NOT appear in GET /api/v1/posts/feed

   **Deletion:**
   - Delete a post as author → confirm success
   - Delete a post as community moderator → confirm success
   - Delete the community as leader → confirm all posts and comments are removed

2. Update `/backend/CLAUDE.md` — API routes done section:

```
## API routes done (add these)
- GET    /api/v1/communities/private (public)
- POST   /api/v1/communities/private (protected, multipart)
- GET    /api/v1/communities/private/:id (protected, members only)
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
```
