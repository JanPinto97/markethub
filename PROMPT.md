# PROMPT — Fase 3, Part 1: Models

Read `CLAUDE.md` at the project root and `/backend/CLAUDE.md` before starting.
Read `/COMMUNITY.md` fully before writing any code.

**Current task:** Create all the new models required for Phase 3 (Community page) and update the existing User model. No API logic yet, only Mongoose schemas.

**Important architectural decision:** There are two completely separate post types that must NEVER be mixed:

- `PostX` — used in general feed and communities (public and private)
- `PostReddit` — used exclusively in discussion topics

---

## 1. Update existing User model (`/backend/models/User.js`)

Add these fields to the existing schema:

```javascript
following; // [{ type: ObjectId, ref: 'User' }], default: []
followers; // [{ type: ObjectId, ref: 'User' }], default: []
coverImage; // String, default: ''
```

Update `toPublicJSON()` to include: `followingCount`, `followersCount`, `coverImage`.

---

## 2. Create `/backend/models/PostX.js`

This is the Twitter/X style post used in general feed and communities.

```javascript
author; // ObjectId, ref: 'User', required
text; // String, required, maxLength: 400
mediaUrl; // String, default: '' (file upload path)
mediaType; // String, enum: ['none', 'image', 'video'], default: 'none'
likes; // [{ type: ObjectId, ref: 'User' }], default: []
commentCount; // Number, default: 0
origin; // String, enum: ['general', 'public_community', 'private_community'], required
community; // ObjectId, ref: either CommunityPublic or CommunityPrivate, default: null
// Only set when origin is 'public_community' or 'private_community'
communityType; // String, enum: ['public', 'private', null], default: null
isPinned; // Boolean, default: false
trendingScore; // Number, default: 0 (calculated field, updated periodically)
createdAt; // Date, default: Date.now
```

Add a static method `calculateTrendingScore(post)`:

- Base score = (likes.length × 1) + (commentCount × 2)
- Apply time decay: if post age < 24h → score × 1, if 24-48h → score × 0.5, if > 48h → score × 0.25
- Return the calculated score

Add `toPublicJSON()` returning: `{ id, author, text, mediaUrl, mediaType, likesCount, commentCount, origin, community, communityType, isPinned, trendingScore, createdAt }`

---

## 3. Create `/backend/models/PostReddit.js`

This is the Reddit style post used exclusively in discussion topics.

```javascript
author; // ObjectId, ref: 'User', required
title; // String, required, maxLength: 300
text; // String, default: '', maxLength: 2000
mediaUrl; // String, default: ''
mediaType; // String, enum: ['none', 'image', 'video'], default: 'none'
upvotes; // [{ type: ObjectId, ref: 'User' }], default: []
downvotes; // [{ type: ObjectId, ref: 'User' }], default: []
commentCount; // Number, default: 0
topic; // ObjectId, ref: 'DiscussionTopic', required
createdAt; // Date, default: Date.now
```

Add a virtual field `voteScore` = `upvotes.length - downvotes.length`.

Add `toPublicJSON()` returning: `{ id, author, title, text, mediaUrl, mediaType, upvotes: upvotes.length, downvotes: downvotes.length, voteScore, commentCount, topic, createdAt }`

---

## 4. Create `/backend/models/Comment.js`

Shared by both PostX and PostReddit. Supports one level of nesting (reply to a comment).

```javascript
author; // ObjectId, ref: 'User', required
text; // String, required, maxLength: 400
postId; // ObjectId, required (references either PostX or PostReddit)
postType; // String, enum: ['PostX', 'PostReddit'], required
parentComment; // ObjectId, ref: 'Comment', default: null
// If set, this comment is a reply to another comment
replyingTo; // ObjectId, ref: 'User', default: null
// The author of the parent comment (for "replying to X's comment" label)
likes; // [{ type: ObjectId, ref: 'User' }], default: []
// Only used when postType is 'PostX'
createdAt; // Date, default: Date.now
```

Add `toPublicJSON()` returning: `{ id, author, text, postId, postType, parentComment, replyingTo, likesCount: likes.length, createdAt }`

---

## 5. Create `/backend/models/CommunityPublic.js`

```javascript
name; // String, required, unique, trim, maxLength: 50
description; // String, default: '', maxLength: 300
avatar; // String, default: ''
members; // [{ type: ObjectId, ref: 'User' }], default: []
// No roles in public communities
postCount; // Number, default: 0
createdAt; // Date, default: Date.now
```

Important business rules to enforce via schema methods:

- `isEmpty()` → returns true if `members.length === 0`
- When `isEmpty()` is true the community must be deleted automatically. Add a post-save hook that checks this and deletes the document if empty.

Add `toPublicJSON()` returning: `{ id, name, description, avatar, memberCount: members.length, postCount, createdAt }`

---

## 6. Create `/backend/models/CommunityPrivate.js`

More complex schema with roles and join requests.

```javascript
name; // String, required, unique, trim, maxLength: 50
description; // String, default: '', maxLength: 300
avatar; // String, default: ''
members; // Array of objects:
// [{
//   user: ObjectId ref 'User', required
//   role: String, enum: ['leader', 'moderator', 'little_whale', 'member']
//        default: 'member'
// }]
joinRequests; // Array of objects:
// [{
//   user: ObjectId ref 'User'
//   message: String, maxLength: 150
//   createdAt: Date, default: Date.now
//   status: String, enum: ['pending', 'accepted', 'rejected']
//           default: 'pending'
// }]
pinnedPosts; // [{ type: ObjectId, ref: 'PostX' }], default: []
postCount; // Number, default: 0
createdAt; // Date, default: Date.now
```

Add these schema methods:

`getLeader()` → returns the member object with role 'leader', or null if none.

`getMemberRole(userId)` → returns the role of a given user, or null if not a member.

`isMember(userId)` → returns true if user is in members array.

`promoteNewLeader()` → implements the leader succession logic:

1. Find a random moderator → promote to leader
2. If no moderators, find a random little_whale → promote to leader
3. If no little_whales, find a random member → promote to leader
4. If no members at all → return null (community should be deleted)

`getRoleWeight(role)` → returns trending weight bonus by role:

```javascript
// leader: 50, moderator: 20, little_whale: 10, member: 0
```

Add a post-save hook: if `members.length === 0`, delete the community automatically.

Add `toPublicJSON()` returning: `{ id, name, description, avatar, memberCount: members.length, postCount, createdAt }`

Add `toDetailJSON()` (for members only) returning: `{ ...toPublicJSON(), members: [{ user: toPublicJSON(), role }], pinnedPosts }`

---

## 7. Create `/backend/models/DiscussionTopic.js`

```javascript
name; // String, required, unique
slug; // String, required, unique (URL-friendly version of name)
category; // String, required, enum of all category names (see list below)
description; // String, default: ''
postCount; // Number, default: 0
createdAt; // Date, default: Date.now
```

Category enum values:

```javascript
["CORE_MARKETS", "ECONOMIA_I_MACRO", "ASSETS_ESPECIFICS", "TRADING_I_INVERSIO"];
```

Add `toPublicJSON()` returning: `{ id, name, slug, category, description, postCount }`

---

## 8. Create the seed script (`/backend/scripts/seedTopics.js`)

This script creates all the fixed discussion topics. They are hardcoded and never change.

Topics to seed, organized by category:

`CORE_MARKETS`: Forex, Crypto, Stocks, Indices, ETFs, Bonds, Commodities, Metals, Energy

`ECONOMIA_I_MACRO`: Macro Economics, Central Banks, Interest Rates, Inflation, GDP & Economic Data, Monetary Policy, Fiscal Policy, Geopolitics, Global Economy

`ASSETS_ESPECIFICS`: Large Cap Stocks, Small Cap & Penny Stocks, Growth Stocks, Value Investing, Dividend Investing, IPOs, SPACs, Startups & Venture Capital, Real Estate & REITs

`TRADING_I_INVERSIO`: Day Trading, Swing Trading, Position Trading, Long-term Investing, Scalping, Algorithmic Trading, Quant Trading, High Frequency Trading

The slug must be auto-generated from the name: lowercase, spaces replaced with hyphens, special characters removed.
Example: "Large Cap Stocks" → "large-cap-stocks", "GDP & Economic Data" → "gdp-economic-data".

The script must:

- Load dotenv from `../.env`
- Connect to MongoDB
- Check if topics already exist before inserting to avoid duplicates
- Log how many topics were created or skipped
- Disconnect and exit when done

Add to `package.json`:

```json
"seed:topics": "node scripts/seedTopics.js"
```

---

## When done

1. Run `npm run seed:topics` and confirm all topics are created in MongoDB
2. Run it again and confirm it skips creation without errors
3. Confirm the post-save hook works on CommunityPublic and CommunityPrivate by writing a quick test in the terminal
4. Update `/backend/CLAUDE.md` — Models done section:

```
## Models done
- User: updated with following, followers, coverImage
- PostX: Twitter/X style post for general feed and communities (max 400 chars)
- PostReddit: Reddit style post for discussion topics only (title + text + votes)
- Comment: shared by both post types, supports one nesting level, likes only on PostX comments
- CommunityPublic: no roles, auto-delete when empty
- CommunityPrivate: roles (leader, moderator, little_whale, member), join requests (max 150 chars), auto-delete when empty, leader succession logic
- DiscussionTopic: fixed topics, hardcoded via seed, never change
```
