# Home (Landing) — Design Notes

Source: handoff bundle from claude.ai/design (`Landing Page.html` + `colors_and_type.css` + `styles.css` + JSX components). Bundle assets copied to `frontend/src/assets/landing/`.

## Page scope

- Route `/` — public landing page for non-authenticated users.
- The landing **owns its own chrome** (header + footer). The global `<app-header />` and `<app-ticker />` in `app.ts` are hidden on `/` via the `showGlobalChrome()` computed signal. There is no global footer in the app shell; the landing renders its own.

## Sections (top → bottom)

1. **Landing header** — sticky, glass-on-scroll. Logo + nav (Community/Markets/IA) + Sign in / Sign up.
2. **Hero** — full-bleed emerald-liquid background, dark veil, big display headline, lede + dual CTA, 3-stat proof row, glass quote card on the right.
3. **LiveRoom** — community teaser: 1 featured post (with photo) + 2 stacked posts in a 1.45 / 1 grid.
4. **MarketsTeaser** — two cards side-by-side (Today's gainers / laggards), monospaced numbers, sparkline.
5. **Voices** — asymmetric 12-col grid of 4 pull-quote cards (white / emerald / white / navy). Section sits on a tonal lift (`--surface-container-low`), bleeds full-width.
6. **AIBlock** — IA pitch: portrait art on the left + copy and chat-style mocked exchange on the right.
7. **Pricing** — centered head; two plan cards (Reader / Pro). Pro plan uses `--primary-container` (deep navy).
8. **FAQ** — 2-col layout, sticky intro on the left, accordion of 6 items on the right. Single item open at a time, first open by default.
9. **FinalCTA** — full-width inset card, blue-tickers photo with a navy → emerald gradient veil.
10. **Landing footer** — brand + tag, 3 link columns (Product / Company / Legal), disclosure line.

## Tokens (scoped to this page only)

All design tokens are declared on `:host` with an `--mh-*` prefix so they do not leak into the global system. Source palette matches the design bundle (`colors_and_type.css`):

- Surfaces: `#f7f9fb`, `#f2f4f6`, `#eceef0`, …
- Primary: `#000` / navy `#0d1c32`
- Secondary (financial green): `#006c49`, `#4edea3`, `#6cf8bb`
- Type: Manrope (display, 300–800), Inter (body), JetBrains Mono (tabular numbers / tickers)
- Motion: `--mh-ease-pulse: cubic-bezier(0.22, 1, 0.36, 1)`, durations 140 / 220 / 320 ms

Class names are prefixed `mh-*` (per the bundle) to avoid collisions with the rest of the app.

## Interactivity

- **Scroll-reveal:** every `.mh-section`, `.mh-hero`, and `.mh-finalcta-wrap` starts with `.mh-reveal`. An `IntersectionObserver` in `ngAfterViewInit` (threshold 0.08, root margin `0 0 -40px 0`) adds `.is-in` once and unobserves.
- **Header scrolled state:** `@HostListener('window:scroll')` flips a signal; CSS adds `.is-scrolled` (slightly more opaque glass).
- **FAQ accordion:** single signal `openFaq()` (default 0). Click toggles; CSS uses `grid-template-rows: 0fr → 1fr` for a smooth height transition.
- **Card hover:** subtle `translateY(-2px)` + ambient shadow on `.mh-post`, `.mh-voice` (voice cards 2 and 4 keep their asymmetric offset on hover).

## CTAs

- Hero "Join the room" → `/register`
- Hero "Browse the feed →" → `/community`
- Pricing Reader "Create a free account" → `/register`
- Pricing Pro "Start 14 days of Pro" → `/register`
- Final CTA "Join the room — free" → `/register`
- Final CTA "Browse without an account →" → `/community`
- Footer Product links → `/community`, `/markets` (IA and Pricing routes don't exist yet; placeholder `#`).

## Decisions / notes

- The original design's `TickerBar` was explicitly removed by the user in the chat ("Apply comment: Ticker bar removed — the hero now sits directly under the header."). Not re-introduced.
- The design's "Tweaks panel" (variant switcher) is an authoring tool, not production. Not implemented.
- Bundle's standalone JSX components were collapsed into one Angular component with `templateUrl` + `styleUrl` — they were already kit-local with no shared state. Splitting back into Angular sub-components would only add overhead.
- All sample copy (posts, voices, tickers, FAQ) is preserved verbatim from the design — replace with real data when the corresponding APIs are ready.
- Sparklines are inline SVG polylines per row direction (up/down). Real per-asset shapes can be swapped in later from `MarketsService`.
- Assets that ship in `frontend/src/assets/landing/` from the bundle: `hero-liquid-emerald.jpg`, `network-pins.jpg`, `photo-blue-tickers.jpg`, `photo-candles-bokeh.jpg`, `logo-mark-black.png` (also kept: `logo-mark-white.png`, `logo-wordmark-black.png`, `photo-trader-desk.jpg`, `photo-charts-glasses.jpg` for future use).

## Responsive

Single breakpoint at 820px. Mobile collapses all 2-col grids to 1 column, drops the desktop nav, hides Voices asymmetry, removes FAQ stickiness, and tightens the header.
