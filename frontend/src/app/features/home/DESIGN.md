# Home (Landing) — Design Notes

Source: handoff bundle from claude.ai/design (`Landing Page.html` + `colors_and_type.css` + `styles.css` + JSX components). Bundle assets copied to `frontend/src/assets/landing/`.

## Page scope

- Route `/` — public landing page for non-authenticated users.
- The landing **uses the global chrome**: `<app-header />` from `app.ts` renders on top, `<app-ticker />` renders below the header, and the shared `<app-footer />` renders at the bottom (the footer is also rendered on `/markets`; everywhere else it is hidden). The landing's own header and footer (from the original claude.ai/design bundle) have been removed.

## Sections (top → bottom)

1. **Hero** — full-bleed emerald-liquid background, dark veil, big display headline ("Markets, told as a story."), eyebrow ("This week — CPI · PMI · FOMC minutes"), lede + dual CTA ("Create a free account" / "Explore as a guest →"), 3-stat proof row (100K+ / <1s / 100+), glass quote card on the right with a sample community post.
2. **LiveRoom** — community teaser: 1 featured post (with photo, Semiconductors Club) + 2 stacked posts (Macro topic + FX Traders private community) in a 1.45 / 1 grid.
3. **MarketsTeaser** — two cards side-by-side (Today's gainers / laggards), 5 asset classes covered (crypto, forex, commodities, indices, stocks). Monospaced numbers, sparkline per row.
4. **Voices** — 2x2 grid of 4 pull-quote cards mapped to the four personas (curious beginner, active trader, community builder, anyone). Each card has a two-square head row (avatar + role/meta) at the top and the quote below. Variants: white / emerald / white / navy. Section sits on a tonal lift (`--surface-container-low`), bleeds full-width.
5. **AIBlock** — Warren assistant pitch: portrait art on the left (`ai-particles.jpg`, rev 2 image) on a dark `#050807` background, with an emerald-tinted glass caption (subtle inset green border, mint eyebrow). Chat-style mocked exchange on the right.
6. **FAQ** — 2-col layout, sticky intro on the left, accordion of 7 items on the right (real product Q&A: free, guest browsing, asset classes, public vs private, communities, topics, disclaimer). Single item open at a time, first open by default.
7. **FinalCTA** — full-width inset card, blue-tickers photo with a navy → emerald gradient veil. Eyebrow "This week — CPI · PMI · FOMC minutes", title "One place for the signal and the community."

The global `<app-footer />` is rendered by `app.ts` below the FinalCTA on this route (and on `/markets`). It is a separate shared component, not part of `home.component.*`.

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
- **FAQ accordion:** single signal `openFaq()` (default 0). Click toggles; CSS uses `grid-template-rows: 0fr → 1fr` for a smooth height transition.
- **Card hover:** subtle `translateY(-2px)` + ambient shadow on `.mh-post` and `.mh-voice`.

## CTAs

- Hero "Create a free account" → `/register`
- Hero "Explore as a guest →" → `/markets`
- Final CTA "Create a free account" → `/register`
- Final CTA "Explore as a guest →" → `/markets`
- Markets card "Open Markets" links → `/markets`
- Footer links are owned by the shared `<app-footer />` (see `/shared/components/footer/`) and only reference real routes (`/community`, `/markets`, `/login`, `/register`, `/settings`).

## Decisions / notes

- Pricing section removed: MarketHub is fully free, there is no Pro tier in the actual product.
- Bundle's standalone JSX components were collapsed into one Angular component with `templateUrl` + `styleUrl` — they were already kit-local with no shared state.
- All sample copy (posts, voices, tickers, FAQ) is preserved verbatim from the new design bundle.
- Sparklines are inline SVG polylines per row direction (up/down). Real per-asset shapes can be swapped in later from `MarketsService`.
- Assets that ship in `frontend/src/assets/landing/` from the bundle: `hero-liquid-emerald.jpg`, `ai-particles.jpg` (rev 2, replaces `network-pins.jpg` for the AI block), `photo-blue-tickers.jpg`, `photo-candles-bokeh.jpg`, `logo-mark-black.png` (also kept: `logo-mark-white.png`, `logo-wordmark-black.png`, `photo-trader-desk.jpg`, `photo-charts-glasses.jpg`, `network-pins.jpg` for future use).

## Responsive

Single breakpoint at 820px. Mobile collapses all 2-col grids to 1 column and removes FAQ stickiness. The global header, ticker, and shared footer handle their own responsive collapse.
