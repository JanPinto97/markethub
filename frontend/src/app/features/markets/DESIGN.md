# Design System Specification: The Architectural Pulse

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
