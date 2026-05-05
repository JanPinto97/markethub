# Claude Code Prompt — Emoji Picker Overhaul

### Context

Angular 17+ standalone components. Pure custom CSS, no external libraries. Existing `EmojiPickerComponent` has hardcoded emojis and renders above the trigger button, covering the post composer. Used inside post creation components (PostX and PostReddit composers).

---

### Task

Replace the existing `EmojiPickerComponent` with a full standard emoji set loaded from CDN, fix popup position to always open downward, and add category tabs and search.

---

### Constraints

**Data source:**

- Fetch emoji data from `https://cdn.jsdelivr.net/npm/unicode-emoji-json@0.6.0/data-by-group.json` once on first open, then cache in memory (do not re-fetch)
- This JSON provides emojis grouped by category with `emoji`, `name`, and `group` fields

**Popup position:**

- Always renders below the trigger button: `position: absolute; top: 100%; left: 0`
- Parent container must have `position: relative`
- `z-index` high enough to overlap composer content

**Popup layout:**

- Fixed size: `width: 320px; height: 400px`
- Top: search input (debounce 200ms, filters by emoji `name`)
- Below search: horizontal scrollable category tab bar; one tab per group from the JSON (use the group name as label, no icons required)
- Main area: scrollable grid of emoji buttons (`font-size: 1.4rem`, 8 columns); clicking an emoji appends it to the post textarea and closes the picker
- Loading state: show "Loading emojis..." text while fetching
- Empty search state: "No emojis found"

**Behaviour:**

- Close on outside click or Escape key
- Search overrides category tab (shows results across all categories)
- Clearing search restores the active category tab view

**Out of scope:** skin tone variants, recently used, keyboard navigation within grid.

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
