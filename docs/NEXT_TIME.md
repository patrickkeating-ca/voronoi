# Next time: improving voronoi-robo.html (archived)

`voronoi-regime.html` picked up three analytical features this round (soft
blend, transition matrix, real-returns backtest). `voronoi-robo.html` didn't
get equivalent treatment — it still has hard-labeled contestable clients,
static (non-draggable) portfolio seeds, and no historical/backtest angle of
its own beyond the regime-tilt ledger stat it borrows from the sibling page.
Below are candidates, tiered by effort, for closing that gap. **Tiers 1-4
are done**; the one open item (empirically calibrating the overlay shift
magnitudes) is explicitly deferred — kept as a historical record of the
triage reasoning, not a live task list.

## Tier 1 — parity with voronoi-regime.html, cheap (done, `sandbox/robo`)

- [x] **Soft blend for contestable clients.** `voronoi-robo.html` already
  computes `c.nearest` / `c.second` per client (`reclassifyClients()`) and
  flags `c.contestable` — same shape as the regime page before its blend
  feature. The tooltip currently just tags contestable clients
  `"contestable"`; extend it to a real blend label ("58% Balanced / 42%
  Growth (short horizon)") the same way `blendLabel()` works in
  `voronoi-regime.html`. Nearly copy-paste of existing logic.
- [x] **Draggable portfolio seeds.** `voronoi-regime.html`'s regime seeds are
  draggable, live-recomputing cells and reclassification; `voronoi-robo.html`'s
  six portfolio seeds only move via the fixed overlay shift amounts. Adding
  drag would let a viewer explore "what if this model portfolio's risk
  score were different" directly, matching the sibling page's interactivity
  and its `rebuildVoronoi()` / `reclassifyClients()` refresh pattern.

## Tier 2 — deepens the analytical story, moderate effort (done, `sandbox/robo`)

- [x] **Cross-regime reassignment matrix.** The page already snapshots
  `neutralCellByClientId` and recomputes `c.cell` per overlay
  (`applyOverlay()`). Extend that into a 6x6 matrix — for every pair of the
  six regime overlays, how many of the 320 clients would be assigned to a
  *different* portfolio under B than under A. Same shape as the transition
  matrix already built for `voronoi-regime.html`, just keyed by regime pairs
  rather than day-over-day sequence (there's no time axis for clients, so
  it's a static cross-tab, not a Markov chain).
- [x] **Per-client fragility score.** For each client, count how many distinct
  portfolios they'd land in across all six regime overlays (1 = totally
  stable assignment regardless of market regime, up to 6 = bounces between
  every portfolio). Surface as a ledger stat ("N% of clients get reassigned
  to 3+ different portfolios depending on regime") — a sharper, single-number
  version of "contestable clients" that accounts for the overlay dimension
  clients are actually exposed to, not just static geometric proximity.

## Tier 3 — highest effort, ties to real data (mirrors the regime-tilt backtest)

- [x] **Backtest the model portfolios' own alloc, not just regime tilts.**
  (done, `sandbox/robo`) The regime-tilt backtest
  (`scripts/backtest-returns.js`) uses `equity/bond/gold/cash` — the regime
  page's tilt keys. The robo portfolios use a *different* key set,
  `equity/bond/cash/alt` (no gold, has "alt"). `scripts/backtest-robo-returns.js`
  answers "would reassigning a client's portfolio by regime overlay have
  beaten leaving them in their neutral-assigned portfolio" using VNQ (a
  REIT proxy) for the `alt` leg. Result: a materially different, more
  skeptical finding than the regime-tilt backtest — reassignment is rare
  for this seed layout (at most 1% of days, only 2 of 6 portfolios) and,
  where it happens, is a wash to modestly negative (mean -0.9pt) rather
  than the regime-tilt backtest's clear +20.9pt edge. See
  `docs/ROBO_RETURNS_BACKTEST.md`.
- **Empirically calibrate the overlay shift magnitudes.** `REGIME_OVERLAYS`'
  shift values (+6 for Melt-Up, -20 for Shock Selloff, etc.) are hand-picked,
  not derived from anything. Now that the Tier 3 backtest above exists, the
  shifts could be tuned so they're the magnitude that would have actually
  been justified by the return data, rather than illustrative guesses —
  turns "the overlay moves the seeds" from a plausible idea into a measured
  one. **Explicitly deferred** (per the user's choice when planning the
  backtest above) — worth a separate, deliberate decision rather than
  folding it into the same pass, partly because the backtest above shows
  reassignment is rare enough at the current shift magnitudes that it's
  unclear a single 3-year window's data should be trusted to re-tune them
  without risking overfitting a demo's illustrative numbers to one sample.

## Tier 4 — nice to have, housekeeping (done, `sandbox/stylesheet`)

- [x] **Consolidate the shared CSS into one file.** `voronoi-robo.html` and
  `voronoi-regime.html` each have their own `<style>` block, and the two are
  ~80% line-for-line identical (306 of 383/371 lines match exactly): the
  `:root`/dark-mode/`data-theme` token definitions, base resets, tooltip,
  ledger, sidebar/portfolio-card, and button styles are all copy-pasted
  verbatim. Only the layout-specific rules genuinely differ (`.floor`,
  `.explainer` grid columns, the regime page's `.trail-controls` and
  `.transition-table`, the robo page's `.overlay-panel`). Split the common
  ~80% into a single `vendor/`-adjacent shared stylesheet (e.g.
  `shared.css` at the repo root, alongside the two HTML files) loaded via
  `<link rel="stylesheet" href="./shared.css">` in both — `<link>` isn't
  subject to the `file://` CORS restriction that rules out `fetch()`
  elsewhere in this repo (see `CLAUDE.md`'s "Running the pages" section), so
  this doesn't conflict with the no-build/no-server philosophy. Each page
  keeps a smaller `<style>` block for its own layout-specific rules.
  Cross-file coupling risk doesn't get worse — arguably better, since the
  currently-duplicated token/component styles would only need updating in
  one place instead of two.

## Skip candidates

- Real client data / CRM integration — fights the synthetic, self-contained
  identity that's the project's whole point (see `docs/NEXT_STEPS.md`'s
  "explicitly skipped" section for the same reasoning applied elsewhere).
- Anything requiring a backend or live client accounts — same reason.
