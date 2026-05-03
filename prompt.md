# Claude Code Prompt — Private Community Details Page

### Context

Angular 17+ standalone components, Node.js/Express MVC, MongoDB/Mongoose. Pure custom CSS with existing project variables, no frameworks. Community roles: `leader`, `moderator`, `whale` (≡ member for this page), `member`. All images use file upload (no text URLs). Current private community route `/community/p/:id` has: center feed, right sidebar with members table + pending requests, Leave and Delete Community buttons in the header.

---

### Task

1. Create new page `/community/p/:id/details` with members table and pending requests, role-based controls.
2. Refactor `/community/p/:id` to match public community layout (feed only, no right sidebar), replacing Leave/Delete buttons with a single "Details" button visible to all members.
3. Remove Leave and Delete Community from `/community/p/:id`.

---

### Constraints

**`/community/p/:id` changes:**
- Remove right sidebar (members table + pending requests)
- Remove Leave and Delete Community buttons from header
- Add "Details" button in header → navigates to `/community/p/:id/details`; visible to all members
- Resulting layout identical to `/community/c/:id`

**`/community/p/:id/details` — layout (desktop):**
- Header: community avatar + name + description + Private badge + role-based action buttons
- Main block (full width, left): members table with columns username, role, actions
- Sidebar (right): pending requests panel

**`/community/p/:id/details` — layout (mobile):**
- Single-column stacked layout; no sidebar
- Order: header → members table → pending requests (if visible by role)
- Action buttons in header stack vertically or collapse into a menu if more than 2
- Members table rows: avatar + username stacked, role badge below, actions as icon buttons only (no text labels)
- Pending requests: full width card list

**Role permissions matrix:**

| Feature | leader | moderator | member/whale |
|---|---|---|---|
| Access page | ✅ | ✅ | ✅ |
| Leave community | ❌ | ✅ | ✅ |
| Delete community | ✅ | ❌ | ❌ |
| Inline edit name/description | ✅ | ❌ | ❌ |
| Change avatar (file picker) | ✅ | ❌ | ❌ |
| View pending requests | ✅ | ✅ | ❌ |
| Accept/reject requests | ✅ | ✅ | ❌ |
| Assign roles to members | ✅ | ❌ | ❌ |
| Kick members | ✅ | ✅ | ❌ |

**Inline editing (leader only):**
- Pencil icon next to name and description; click converts to `<input>` / `<textarea>` inline with confirm/cancel buttons
- Avatar: hover shows upload overlay icon (upward arrow); click triggers hidden `<input type="file">`; upload via existing API

**Backend — add if missing:**
- `PATCH /api/communities/:id` → update `name`, `description` (leader only)
- `PATCH /api/communities/:id/avatar` → multipart file upload (leader only)

**Out of scope:** join request logic, post feed, pin system, any other page.

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