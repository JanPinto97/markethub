# MarketHub — Community Page: Complete Functional Specification

## Overview

The Community page is a social network that combines X (Twitter) and Reddit mechanics.
It has three completely separate sections with different behaviours:

1. General Feed
2. Communities (Public and Private)
3. Discussion Topics

CRITICAL: There are two post types that must NEVER be mixed under any circumstance:

- PostX — used in General Feed and Communities (public and private)
- PostReddit — used exclusively in Discussion Topics

---

## Section 1: General Feed

### Feed modes

- **Trending** (default): shows PostX posts from the general feed AND from public
  communities, mixed together. Posts from public communities display a small label
  indicating which community they come from.
- **Following**: shows PostX posts only from users the authenticated user follows.
  Never shows posts from private communities, even if the user follows the author.

### Trending algorithm

Score = (likes × 1) + (commentCount × 2), then apply time decay:

- Age < 24h → score × 1.0
- Age 24–48h → score × 0.5
- Age > 48h → score × 0.25
  The `trendingScore` field on PostX is recalculated periodically.

### Who can see the feed

- Anyone (authenticated or not) can view the feed.
- Authenticated users can like, comment, and create posts.
- Non-authenticated users attempting any action are redirected to /login.

### Creating a post in the general feed

- PostX format: text (max 400 chars) + optional image or video (file upload).
- The post origin is set to 'general'.
- Author can delete their own post. Posts cannot be edited.

---

## Section 2: Communities

### Public Communities

**Joining:**

- Any user can join by clicking a join button. No approval needed.
- The join button is visible to non-members. Non-authenticated users are
  redirected to /login.

**Roles:**

- No roles exist in public communities. All members are equal.
- No moderation. No one can delete posts inside a public community.

**Feed:**

- Ordered by trending score (same algorithm as general feed).
- Only shows posts from this specific community.
- Posts from this community also appear in the general feed Trending mode
  with a community label.

**Auto-deletion:**

- When the last member leaves, the community is automatically deleted.
- No warning is given. Deletion is immediate and silent.

**Type lock:**

- A public community cannot be converted to private. This must be
  selected at creation time. A clear warning is shown at creation.

**Creating a post inside a public community:**

- PostX format: text (max 400 chars) + optional image or video (file upload).
- Origin set to 'public_community', community reference set.
- Post appears both in the community feed and in the general Trending feed
  with a community label.

---

### Private Communities

**Joining:**

- The community appears in search results but shows a "Request to Join" button
  instead of a "Join" button.
- The user writes a join request message (max 150 chars) explaining why they
  want to join.
- Request status: pending → accepted or rejected by leader or moderator.

**Roles (4 types):**

| Role         | Assigned by                  | Powers                                                                                                      |
| ------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Leader       | Auto (creator) or succession | Accept requests, reject requests, expel members, promote members, delete posts, pin posts, delete community |
| Moderator    | Leader                       | Accept requests, delete posts                                                                               |
| Little Whale | Leader                       | Feed positioning bonus                                                                                      |
| Member       | Default on join              | None                                                                                                        |

**Role uniqueness:**

- Leader: exactly 1 per community at all times.
- Moderator: multiple allowed.
- Little Whale: multiple allowed.
- Member: multiple allowed.

**Leader succession (when leader leaves):**

1. Pick a random moderator → promote to leader.
2. If no moderators, pick a random little_whale → promote to leader.
3. If no little_whales, pick a random member → promote to leader.
4. If no members at all → delete the community automatically.

**Auto-deletion:**

- When the last member leaves (after succession fails), the community is
  automatically deleted. No warning. Immediate and silent.

**Feed:**

- Ordered by trending score WITH role weight bonus:
  - Leader posts: +50 bonus points
  - Moderator posts: +20 bonus points
  - Little Whale posts: +10 bonus points
  - Member posts: +0 bonus points
- Posts from private communities NEVER appear in the general feed.
- Posts from private communities are NOT visible on the author's public profile.

**Visual role differentiation:**

- Posts from leader, moderator and little_whale appear with a slightly
  different background color depending on role. Exact colors defined in
  /frontend/src/app/features/community/DESIGN.md.

**Pinned posts:**

- Leader can pin one or more posts. Pinned posts always appear at the
  top of the community feed, above the trending-sorted posts.

**Community Details page:**

- Accessible from inside the private community.
- What members see: list of all members with their role displayed next to
  their username, and a button to leave the community.
- What moderators and leaders see additionally: list of pending join requests.
  Clicking a request opens a popup with the full request message and
  accept/reject buttons. Expel button next to each base member's name.
- What the leader sees additionally: promote button next to each member,
  and a delete community button.

---

## Section 3: Discussion Topics

### Overview

Fixed topics created via seed script. They never change and are never
created or deleted through the UI. Only superadmins could modify them
directly in the database if ever needed.

### Categories and topics

**CORE MARKETS:**
Forex, Crypto, Stocks, Indices, ETFs, Bonds, Commodities, Metals, Energy

**ECONOMIA I MACRO:**
Macro Economics, Central Banks, Interest Rates, Inflation,
GDP & Economic Data, Monetary Policy, Fiscal Policy, Geopolitics,
Global Economy

**ASSETS ESPECÍFICS:**
Large Cap Stocks, Small Cap & Penny Stocks, Growth Stocks, Value Investing,
Dividend Investing, IPOs, SPACs, Startups & Venture Capital,
Real Estate & REITs

**TRADING I INVERSIÓ:**
Day Trading, Swing Trading, Position Trading, Long-term Investing,
Scalping, Algorithmic Trading, Quant Trading, High Frequency Trading

### Post format (PostReddit)

- Title (required, max 300 chars) + text (optional, max 2000 chars)
  - optional image or video (file upload).
- Completely separate from PostX. Never shown in general feed or
  community feeds.
- Not shown on the author's public profile.

### Voting system

- Users can upvote OR downvote a post independently (no need to upvote
  before downvoting).
- A user cannot upvote and downvote the same post simultaneously.
  Voting the opposite removes the previous vote.
- The displayed score = upvotes.length - downvotes.length (net score).

### Feed ordering

- Default: sorted by net vote score (descending).
- Alternative: sorted by most recent (createdAt descending).

### Finding topics

- Topics do NOT appear in the general search.
- There is a dedicated popup search for topics, accessible from the
  sidebar. Users can filter by category.
- Users can pin topics to the sidebar from this search popup.
- Pinned topics appear in the sidebar below the communities section.

---

## Comments (shared behaviour for PostX and PostReddit)

### Structure

- Comments are flat (no nesting, no replies).
- Comments cannot be edited. Authors can delete their own comments.
- Moderators and leaders can delete any comment inside their community.
- Superadmins can delete any comment anywhere.

### Likes on comments

- Only comments on PostX support likes.
- Comments on PostReddit do NOT have likes (only the post itself has votes).

---

## Search

### General search (header search bar)

Searches across: users, PostX posts (general + public communities), public
communities, private communities (name only, not content).
Does NOT search: PostReddit posts, discussion topics.

Filter options available when searching:

- Filter by type: users / posts / communities

### Discussion topic search (sidebar popup)

Searches only discussion topics. Filter by category buttons available
(same as TradingView asset search UX). From results, users can:

- Pin a topic to the sidebar
- Navigate directly into the topic

---

## User Profiles (public)

### What is shown

- Avatar, cover image, username, follower count, following count, bio,
  list of public communities the user is a member of.
- PostX posts from the general feed and from public communities.
- Does NOT show: PostReddit posts, posts from private communities,
  private account information.

### Following system

- Any authenticated user can follow/unfollow another user.
- Following a user makes their posts appear in your Following feed.
- Following does NOT grant access to their private community posts.

---

## Private Settings Page (/settings)

Separate from the public profile. Authenticated users only.
Allows changing: username, email, password (requires current password).
This is completely separate from the public profile view.

---

## Roles with platform-wide powers (from Phase 2)

- **Superadmin**: can delete any post (PostX or PostReddit), any comment,
  and any user account anywhere on the platform.
- **Moderator** (platform role, distinct from community moderator role):
  same deletion powers as superadmin.
  Note: "moderator" as a platform role (set in User.role) is different
  from "moderator" as a community role (set in CommunityPrivate.members[].role).
  These are two separate concepts and must never be confused.
