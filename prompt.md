# Claude Code Prompt — Global Header

### Context

Angular 17+ standalone components, pure custom CSS with project variables, no frameworks. Auth state available via existing `AuthService` (exposes `currentUser$` and `isLoggedIn$`). Currently `/community` has a temporary inline header that must be removed and replaced by the global one. Logo file currently at `./logos/full_logo_negre_transparent.png` (provisional path).

---

### Task

Implement a global `HeaderComponent` rendered on every page via `AppComponent`, replacing the temporary header in `/community`. Remove the temporary header from the community layout.

---

### Constraints

**Logo:**

- Move `./logos/full_logo_negre_transparent.png` to `frontend/src/assets/images/full_logo.png`
- Reference it in the header as `<img src="assets/images/full_logo.png">`

**Desktop layout (single row):**

- Left: logo (`<img>`) → nav links `Community` `/community`, `Markets` `/markets`, `IA` (no route, pointer-events none or disabled state)
- Right: if unauthenticated → `Login` (`/login`) + `Sign Up` (`/register`) buttons; if authenticated → settings icon (cog, links to `/settings`) + user avatar (links to `/profile/:username`)
- Active nav link: green underline using `routerLinkActive` with a CSS class; use the project's existing green CSS variable for the underline color
- Header is `position: fixed; top: 0; width: 100%; z-index` above all page content; all pages must add `padding-top` equal to header height to avoid content overlap

**Mobile layout (two rows):**

- Row 1: logo (left) + auth buttons or avatar/settings (right)
- Row 2: nav links `Community`, `Markets`, `IA` centered horizontally
- No hamburger menu

**Community page:**

- Remove the existing temporary header markup and styles from the community layout component
- The sidebar and feed remain unchanged; only the header is extracted

**Out of scope:** search bar in header, IA widget, notification bell, any other page layout changes.

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
