## 1. Overview & Creative North Star: "The Informed Curator"

This design system moves beyond the cold, sterile nature of traditional banking and the chaotic density of social media. Our Creative North Star is **The Informed Curator**.

We reject the "boxed-in" look of legacy dashboards. Instead, we embrace an editorial layout that breathes. By utilizing intentional asymmetry, expansive whitespace, and sophisticated tonal layering, we create an environment that feels authoritative yet fluid. This system treats data as a narrative, using high-contrast typography and "floating" surfaces to guide the user’s eye through complex financial landscapes without cognitive fatigue.

---

## 2. Color & Tonal Surface Strategy

Our palette is rooted in the authority of deep navy and the vitality of financial growth. However, the secret to a premium feel lies in how these colors are layered, not just applied.

### The "No-Line" Rule

**Strict Mandate:** 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background color shifts.

- Use `surface` (#f7f9fb) for the primary canvas.
- Use `surface_container_low` (#f2f4f6) for sidebar or secondary navigation zones.
- Use `surface_container_lowest` (#ffffff) for primary content cards to make them "pop" against the canvas.

### The Glass & Gradient Rule

To achieve a "FinTech-Social" hybrid feel, use **Glassmorphism** for floating elements (like hover tooltips or mobile navigation bars).

- **Token:** `surface_variant` at 60% opacity with a `20px` backdrop-blur.
- **Signature Gradients:** For primary CTAs and growth charts, use a linear gradient transitioning from `secondary` (#006c49) to `secondary_fixed_dim` (#4edea3) at a 135-degree angle. This adds a "glow" that flat colors lack.

---

## 3. Typography: Editorial Authority

We pair **Manrope** (Display/Headlines) with **Inter** (Body/UI) to balance character with legibility.

- **Display (Manrope):** Used for portfolio totals and major social headings. The wide stance of Manrope suggests stability and modernism.
- **Body & Labels (Inter):** Used for data grids and social feeds. Inter’s tall x-height ensures readability even at `body-sm` (0.75rem).
- **Hierarchy Tip:** Always use `on_surface_variant` (#44474d) for secondary metadata to create a clear visual step-down from the primary `on_surface` (#191c1e) titles.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "heavy" for a precision financial tool. We use **Ambient Depth**.

- **The Layering Principle:** Depth is achieved by stacking. Place a `surface_container_lowest` card on a `surface_container` background. The subtle shift from #ffffff to #eceef0 creates a natural lift.
- **Ambient Shadows:** For high-priority floating modals, use a custom shadow: `0 20px 40px rgba(13, 28, 50, 0.06)`. Note the tint—the shadow uses a hint of our `primary_container` navy rather than pure black, making it feel integrated into the environment.
- **The "Ghost Border" Fallback:** If a divider is essential for accessibility, use `outline_variant` at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Primitives

### Buttons

- **Primary:** Solid `primary` (#000000) or the Signature Green Gradient. Use `DEFAULT` (0.5rem) rounding. No shadow.
- **Secondary:** `surface_container_high` background with `on_surface` text.
- **Interaction:** On hover, shift background to `primary_container` (#0d1c32) to signal depth.

### Cards & Data Widgets

- **Rule:** Forbid divider lines within cards.
- **Structure:** Use `spacing-6` (1.5rem) of vertical whitespace to separate header, chart, and footer.
- **Rounding:** Use `md` (0.75rem) for standard cards and `xl` (1.5rem) for featured "Social Spotlights."

### Input Fields

- **Style:** Minimalist. No bottom line or full border. Use a `surface_container_low` fill with a `md` corner radius.
- **Focus State:** Transition the background to `surface_container_highest` and apply a 1px "Ghost Border" of `secondary` (#006c49).

### Specialized FinTech Components

- **Growth Badges:** Use `secondary_container` (#6cf8bb) with `on_secondary_container` (#00714d) text for positive trends.
- **Social Tickers:** Horizontal scrolling tracks of market data should use `surface_container_lowest` with a subtle `backdrop-blur` when overlaid on content.

---

## 6. Do’s and Don’ts

### Do:

- **Do** use asymmetrical layouts. A 3-column grid where the center column is significantly wider creates an editorial, "feed" feel.
- **Do** use `on_primary_container` (#76849f) for "ghost" text in search bars.
- **Do** lean into the `spacing-12` and `spacing-16` values for hero sections to convey luxury.

### Don’t:

- **Don’t** use pure black (#000000) for text. Use `on_surface` (#191c1e) to reduce eye strain.
- **Don’t** use 100% opaque borders. They clutter the UI and break the "Architectural Pulse" feel.
- **Don’t** use standard "FinTech Blue." Stick to our Deep Navy and Vibrant Green to maintain our unique brand identity.

---

## 7. Community Page — Specific Tokens & Decisions

These extend the global system above for the Community page layout.

### Layout

- **3-column layout** using flexbox within `max-width: 1280px`.
- Left sidebar: 240px (`--sidebar-left-width`), sticky with own scroll.
- Right sidebar: 300px (`--sidebar-right-width`), sticky, no scroll.
- Center feed: flexible, scrolls with page.
- Header: 60px (`--header-height`), fixed at top, `z-index: 100`.

### Header

- Background: `--surface-container-lowest` — floats above the canvas.
- Brand: Manrope `--text-display-sm`, `--weight-extrabold`.
- Search bar: `--surface-container-low` fill, `--radius-md`.
- Focus: `--surface-container-highest` + 1px inset `--secondary` ghost border.
- Placeholder color: `--on-primary-container` (#76849f).

### Sidebar Left

- Active nav item: `--secondary` (#006c49) text color.
- Section titles: `--text-body-sm`, `--weight-semibold`, `--on-surface-variant`, 0.05em tracking.
- Community initials: 28×28px squares, `--radius-default`, colored bg, white text.
- "Create Community" CTA: Signature Green Gradient (`--gradient-primary`).

### Feed Cards

- Cards use `--surface-container-lowest` on `--surface` canvas (tonal layering).
- Rounding: `--radius-md` (0.75rem) per standard card spec.
- No borders within cards (No-Line Rule).
- Tab active state: `--surface-container-high` background.
- Post action icons: `--on-surface-variant`, hover → `--on-surface`.

### Community Label on Posts

- Posts from communities show a label in `--secondary` (#006c49), `--text-body-sm`, `--weight-medium`.

### Post Card (PostCardComponent) — Prompt 3

- Avatar: 40px circle. Initial fallback uses a hashed HSL color (55% saturation, 45% lightness) for consistent per-user tint.
- Author name: `--weight-semibold`, `--text-body-md`, underline on hover (router-link to `/profile/:username`).
- Handle, dot separator, relative time: `--text-body-sm`, `--on-surface-variant`.
- Community badge (when `origin === 'public_community'`): `--secondary`, `--text-body-sm`, `--weight-medium`, prefix "in ".
- Three-dot menu: `--on-surface-variant`, opacity 0 by default, opacity 1 on card hover or button focus. Menu panel uses `--surface-container-lowest` + `box-shadow: 0 4px 16px rgba(0,0,0,0.15)` (acceptable floating element exception, glass rule not used here for legibility).
- Menu danger action: `--error` color (#dc2626 fallback).
- Body text: `white-space: pre-wrap`, `word-wrap: break-word`, line-height 1.6.
- "See more" button at 280 chars: `--secondary`, underline on hover.
- Post media: `border-radius: --radius-md`, `max-height: 400px`, `object-fit: cover`.
- Like button states: default `--on-surface-variant`; liked → `--secondary` with filled icon.
- Comments section: top separator uses background shift — `border-top: 1px solid --surface-container-high` (exception to the No-Line Rule granted for the intra-card separator between post and comments, as the card already reserves tonal layering for sectioning).
- Comment avatar: 32px circle, same initial-color hashing as author avatar.
- Comment input: same styling as main post input (`--surface-container-low` background, inset secondary ring on focus).

### Create Post Card — Prompt 3

- Textarea auto-resizes between 40px and 200px (`min-height`/`max-height` + JS `scrollHeight` on input).
- Char counter appears only when text length > 0; turns `--error` + `--weight-semibold` past 360/400.
- Image preview thumbnail: max 240px wide, 180px tall, `object-fit: cover`, `--radius-md`. Remove button is a 24px circle with `rgba(0,0,0,0.6)` background and white "×".
- Error message under the card: `--surface-container-low` background, `--error` text, `--text-body-sm`.
- Unauthenticated state: input uses `readonly` text input with placeholder "Sign in to join the conversation"; any focus/click redirects to `/login`.

### Feed States

- Loading, empty, error: centered text in a `--surface-container-lowest` card with generous padding (`--spacing-6`).
- End-of-feed message: `You're all caught up 🎉` in `--on-surface-variant`.
- Infinite scroll: `IntersectionObserver` with `200px` rootMargin on a sentinel div at the feed bottom; spinner text "Loading more…" while fetching the next page.

### Community Public Detail Page — Prompt 8

- **Route:** `/community/c/:id` — no auth required to view, actions require login.
- **Layout:** Single centered column, max-width 640px, no sidebars. Same header as community page (fixed, `--header-height`).
- **Community banner:** `--surface-container-lowest` card, `--radius-md`, `--spacing-6` padding. Avatar 72px circle (initial fallback with HSL color). Name uses `--font-display`, `--text-display-sm`, `--weight-bold`. Member count: `--text-body-sm`, `--on-surface-variant`. Description: `--text-body-md`, `--on-surface-variant`, max 2 lines (`-webkit-line-clamp: 2`).
- **Join button:** Signature Green Gradient (`--gradient-primary`), `--on-primary` text, `--radius-default`.
- **Leave button:** `--surface-container-high` background, `--on-surface` text. Hover → `--surface-container-highest`.
- **Leave confirmation dialog:** Fixed overlay `rgba(0,0,0,0.5)`, dialog uses `--surface-container-lowest`, `--radius-md`, `--shadow-ambient`. Warning text for last member uses `--error` color. Cancel button: secondary style. Leave button: `--error` background.
- **Create post box:** Same styling as community page. Three states: not authed (sign-in banner, centered text), not member (disabled input "Join this community to post"), member (full textarea + media + emoji).
- **Feed:** Reuses `PostCardComponent` with infinite scroll (`IntersectionObserver`, 200px rootMargin). Skeletons, error with retry, empty states.

### Create Community Modal — Prompt 8

- **Trigger:** "Create Community" button in sidebar opens the modal.
- **Overlay:** Fixed, `z-index: 200`, `rgba(0,0,0,0.5)`. Closes on overlay click or Escape.
- **Container:** `--surface-container-lowest`, `--radius-md`, max-width 480px, `--shadow-ambient`.
- **Title:** `--font-display`, `--text-display-sm`, `--weight-bold`.
- **Fields:** Same input styling (surface-container-low fill, radius-md, secondary ghost border on focus). Textarea for description with char counter. Avatar URL with live preview (40px circle).
- **Type selector:** Radio buttons with `accent-color: --secondary`. Warning message below in `--surface-container-low` bg.
- **Validation:** Name 3–50 chars required, description max 300, 409 error inline under name field, generic error above footer actions.
- **Actions:** Cancel (secondary), Create (gradient-primary). Disabled at 50% opacity.

### Community Badge on PostCard — Prompt 8

- Community badge in `PostCardComponent` is now a clickable `<a>` tag linking to `/community/c/:communityId`.
- Hover state: underline.

### Sidebar Membership Sync — Prompt 8

- `CommunityService.communityMembershipChanged$` Subject syncs join/leave between detail page and sidebar.
- Join → adds community to MY COMMUNITIES list.
- Leave → removes community from MY COMMUNITIES list.
