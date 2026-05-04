# Claude Code Prompt — Discover Communities

### Context

Angular 17+ standalone components, Node.js/Express MVC, MongoDB/Mongoose. Pure custom CSS with existing project variables, no frameworks. Left sidebar has a communities list ending with a "Discover Communities" button, modelled after the existing "Add Topics" button + topics search popup. Community model has: `name`, `description`, `avatar`, `type` (`public`|`private`), `members[]`, `createdAt`.

---

### Task

Add a "Discover Communities" button at the bottom of the sidebar communities list that opens a search popup. The popup lets users search, filter, and sort communities, then navigate to them.

---

### Constraints

**Backend — new endpoint:**
- `GET /api/communities/discover?search=&sort=popularity|members|new&type=public,private&page=1&limit=20`
- `sort=popularity`: order by number of members who joined in the last 7 days (descending)
- `sort=members`: order by total `members` array length (descending)
- `sort=new`: order by `createdAt` (descending)
- `type`: comma-separated filter; accepts `public`, `private`, or both (default both)
- Response per item: `{ id, name, avatar, type, memberCount, isJoined: bool }`; `isJoined` computed from authenticated user's memberships (unauthenticated → always false)

**Frontend — sidebar:**
- "Discover Communities" button below the communities list, styled identically to the existing "Add Topics" button
- Click opens `DiscoverCommunitiesPopupComponent` (overlay/modal, same visual pattern as topics search popup)

**Frontend — popup (`DiscoverCommunitiesPopupComponent`):**
- Search bar with debounce 350ms + switchMap (cancels previous requests)
- Two filter groups, rendered as toggle button sets:
  - Left group — Sort by (single-select, default `Popularity`): `Popularity`, `Members`, `New`
  - Right group — Type (multi-select toggle, both active by default): `Public`, `Private`; at least one must remain active
- Results list: each item shows avatar, name, type badge (`Public`|`Private`), member count, and `Joined` badge if `isJoined === true`; clicking navigates to `/community/c/:id` (public) or `/community/p/:id` (private) and closes popup
- Re-fetch on any filter or sort change (combine with current search query)
- Empty state: "No communities found"
- Close on backdrop click or Escape key; focus trap inside popup

**Mobile:**
- Popup is full-screen on mobile (`position: fixed; inset: 0`)
- Filter groups stack vertically
- Results list scrollable

**Out of scope:** joining communities from the popup, pagination (load all up to limit=20), any changes to community detail pages.

---

### Output format

Return only new or modified files with their full path as the title of each block. Do not repeat unchanged files.

---

**IMPORTANT:**
- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output (code or requested artifacts)
- Do not repeat unchanged code