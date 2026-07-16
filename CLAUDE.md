# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Two self-contained, no-build-step HTML/JS pages that use Voronoi diagrams
(nearest-seed classification) as a visual/analytical device for fintech
ideas. `index.html` is a landing page linking both:

- **`voronoi-robo.html`** — robo-advisor model portfolio assignment. Six
  model portfolios are seed points in (risk tolerance, time horizon) space;
  320 synthetic clients are classified to the nearest one. A "market regime
  overlay" selector shifts every portfolio's risk coordinate at once (based
  on today's real market regime, or a chosen counterfactual) and reports how
  many clients get reassigned without answering a single new question.
- **`voronoi-regime.html`** — market regime classification over VIX × 10Y-2Y
  yield curve slope. Six regimes are seeds; each trading day is classified
  to the nearest one. Uses real FRED data when available (`data/regime-data.js`),
  with a synthetic fallback otherwise. Seeds are draggable, live-recomputing
  cells and reclassification.

Both pages render Voronoi cells as true polygons via `d3.Delaunay`/`voronoi()`
(vendored locally as `vendor/d3.min.js` — not from a CDN). There is no
npm/package.json; Node is only used for the data-fetching and backtesting
scripts in `scripts/`.

## Layout

```
voronoi-robo.html      \  the two pages themselves, at repo root so
voronoi-regime.html    /  file:// double-click still works
vendor/d3.min.js          vendored d3-delaunay build, not from a CDN
scripts/fetch-data.js     FRED data puller (writes into data/)
scripts/backtest.js       classifier backtest, reads data/backtest-data.json
data/                     gitignored output of fetch-data.js, except
                          regime-data.js (committed real-data snapshot)
docs/BACKTEST.md          backtest findings / known limitations
serve.ps1                 gitignored local-only helper (see README.md)
```

## Commands

```
node --env-file=.env scripts/fetch-data.js                    # fetch 3yr FRED data -> data/regime-data.{json,js}
node --env-file=.env scripts/fetch-data.js 8 backtest-data     # fetch 8yr data -> data/backtest-data.{json,js}
node scripts/backtest.js                                       # run classifier vs. data/backtest-data.json, print findings
.\serve.ps1                                             # optional: npx serve + open browser (see below)
.\serve.ps1 -Port 8080 -Page voronoi-robo.html
```

`fetch-data.js` requires `FRED_API_KEY` in `.env` (see `.env.example`) and
Node 20.6+ for `--env-file`. It takes optional `[yearsBack] [outBasename]`
args so a longer historical pull (for backtesting) doesn't clobber the live
map's 3-year `regime-data.json`/`.js`. Both scripts resolve `data/` relative
to their own file (`path.join(__dirname, "..", "data")`), so they must stay
one level below the repo root in `scripts/`.

There is no lint, test suite, or build step. To sanity-check a page after
editing its inline `<script>`, extract it and run `node --check` on it (see
git history for the exact one-liner used throughout this project) — this
catches syntax errors without needing a browser.

## Running the pages

Both HTML files load their data via `<script src="...">` tags
(`vendor/d3.min.js`, `data/regime-data.js`), **not** `fetch()`. This is
deliberate: opening an HTML file directly via `file://` blocks `fetch()`
of local files under CORS in most browsers, but `<script src>` is exempt.
Do not "fix" this by switching to `fetch()` — it would break direct
file-opening, which is the primary way these pages are used. `serve.ps1`
exists only for the (currently unused) case of a real `fetch()` call being
added later, or LAN testing.

## Data pipeline

- `scripts/fetch-data.js` pulls FRED series `T10Y2Y` (10Y-2Y curve slope) and
  `VIXCLS` (VIX), inner-joins them by date, and writes both a `.json` and
  a `.js` (`window.REGIME_DATA = {...}`) version — the `.js` version is
  what the pages actually load.
- `data/` is gitignored and fully regenerable from `scripts/fetch-data.js`
  and an API key, never hand-edited — **except `data/regime-data.js`**,
  committed on purpose as a real-data snapshot for the live GitHub Pages
  demo, which has no backend/API key to fetch with. Re-run
  `fetch-data.js` and commit the diff periodically to refresh it;
  `data/regime-data.json` and `backtest-data.*` stay gitignored/local-only.
- `voronoi-regime.html`'s regime seeds (VIX/slope coordinates + labels) were
  calibrated by hand against the *3-year* window, checking that all 6 seeds
  get non-empty populations (see conversation/commit history for the actual
  numbers). `scripts/backtest.js` deliberately duplicates the same
  seed/domain constants rather than importing them, so it can test the
  *exact* live classifier against a separate 8-year pull without touching
  the live map.
- **Known limitation** (documented in `docs/BACKTEST.md`, from backtesting
  against 2018-2026 data): seed placement fit to a 3-year window doesn't
  generalize to longer history — e.g. it misses the real, shallow 2019
  yield-curve inversion, and collapses very different volatility spikes
  (VIX 35 vs. 82) into the same "Shock Selloff" label. If you're asked to
  make the classification more robust, read `docs/BACKTEST.md` first.

## Cross-file coupling

`voronoi-robo.html` duplicates `voronoi-regime.html`'s `REGIME_SEEDS` array,
domain constants, and nearest-seed distance function verbatim, in order to
independently compute "today's real regime" (for the default overlay
selection) from the same `data/regime-data.js` file. There is no shared
module — if the regime seeds/domain in `voronoi-regime.html` are changed,
the duplicated copy inside `voronoi-robo.html`'s `<script>` must be updated
to match, or the two pages' idea of "today's regime" will diverge silently.

## Theming

Both pages use the same CSS custom-property token system: colors defined on
`:root`, overridden under `@media (prefers-color-scheme: dark)` for OS-level
dark mode, and again under `:root[data-theme="dark"]` /
`:root[data-theme="light"]` for an explicit in-page toggle (stamped by the
hosting environment, e.g. Claude Artifacts) to win over the media query in
both directions. `--c1`..`--c6` are the six-way categorical palette (one
hue per seed/regime); they differ in meaning between the two files (model
portfolios vs. regimes) despite sharing variable names.
