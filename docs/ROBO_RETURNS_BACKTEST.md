# Return backtest: does reassigning clients by regime overlay pay off?

`scripts/backtest-robo-returns.js` asks a different question from
`docs/RETURNS_BACKTEST.md`'s regime-tilt backtest. That one tests
`voronoi-regime.html`'s `equity/bond/gold/cash` tilt legs; this one tests
`voronoi-robo.html`'s own six model portfolios and their `equity/bond/cash/alt`
alloc — "would a client actually have been better off getting reassigned to
a new model portfolio every time the regime overlay shifted, vs. staying in
whichever portfolio they were neutrally assigned to?"

| Alloc leg | Proxy | Source |
|---|---|---|
| equity | SPY | Yahoo Finance adjusted close |
| bond   | AGG | Yahoo Finance adjusted close |
| cash   | BIL | Yahoo Finance adjusted close |
| alt    | VNQ (Vanguard Real Estate, a REIT proxy) | Yahoo Finance adjusted close |

Reproduce with:

```
node scripts/fetch-returns-data.js
node scripts/backtest-robo-returns.js
```

## Method: one representative client per portfolio

For each of the six model portfolios, this backtest treats a client sitting
**exactly at that portfolio's own neutral seed position** (its `risk`,
`horizon`) as representative, and compares:

- **Static** — buy-and-hold that portfolio's own alloc for the whole window.
- **Adaptive** — for every real trading day, classify the day's actual
  VIX/curve-slope into a regime (same classifier as `voronoi-regime.html`),
  look up that regime's overlay shift (`voronoi-robo.html`'s
  `REGIME_OVERLAYS`), apply it to *all six* portfolio positions, and
  reclassify the representative client against the shifted seeds — exactly
  what `applyOverlay()`/`reclassifyClients()` do live on the page. The
  representative client's own coordinates never move; only the seeds do.

## Headline result (2023-07-18 → 2026-07-14, 3.0 years)

| Portfolio | Static | Adaptive | Edge | Days reassigned |
|---|---|---|---|---|
| Capital Preservation | 19.7% | 19.7% | +0.0 pt | 0% |
| Income & Stability | 27.5% | 25.6% | -1.9 pt | 1% |
| Balanced | 41.3% | 37.7% | -3.6 pt | 1% |
| Growth (short horizon) | 47.2% | 47.2% | +0.0 pt | 0% |
| Growth (long horizon) | 50.8% | 50.8% | +0.0 pt | 0% |
| Aggressive Growth | 63.1% | 63.1% | +0.0 pt | 0% |

**Mean edge: -0.9 points**, range -3.6 to +0.0. Unlike the regime-tilt
backtest's clear +20.9-point edge, reassignment here is rare (at most 1% of
trading days, for only 2 of the 6 portfolios) and, when it happens, is a
wash to modestly negative over this window — a genuinely different, more
skeptical finding than the sibling backtest, not a repeat of it.

## Why reassignment is so rare here

Model portfolios are separated by **both** risk *and* horizon, and horizon
never moves — only the overlay's risk shift does (at most a ±20-point swing
on a 0-100 risk scale). Two portfolios only trade places when they're close
in horizon *and* the risk gap between them is small enough for the shift to
bridge. Most of the six sit far enough apart in either dimension that no
regime-overlay shift observed in this window was large enough to flip
nearest-neighbor status at all — which is itself a real, useful finding:
the overlay concept barely touches this particular seed layout in practice,
even though it visibly reassigns some of the 320 *scattered* synthetic
clients (who sit near boundaries the neutral seeds themselves never reach).

## Why this number should be read skeptically

- **Representative-client simplification.** Using each portfolio's own seed
  as "the" client ignores that real (synthetic) clients scatter around each
  seed — some already sit closer to a neighboring boundary and would
  reassign far more often than their portfolio's own center point does.
  This backtest measures the seeds' own fragility, not the fleet's.
- **VNQ/REIT-specific behavior.** The one leg not shared with the
  regime-tilt backtest — real estate has a distinct volatility and
  drawdown profile (a real, sharp 2020 selloff) from equities/bonds/cash,
  which shapes the small-alt-allocation portfolios' numbers here.
- Everything already flagged in `docs/RETURNS_BACKTEST.md` still applies:
  no transaction costs/taxes/slippage, a single 3-year sample, reliance on
  Yahoo's unofficial chart endpoint, and daily rebalancing being an
  idealization no real advisor would literally implement.

## Bottom line

Over this specific window, the overlay concept turns out to rarely move
model-portfolio-level clients at all, and where it does, it isn't a clear
win the way the regime-tilt backtest's is. That's a legitimate, if less
exciting, finding — not every "the overlay does X" story holds up the same
way once you actually compute it, and this is one honest data point saying
so for the robo page's own alloc structure specifically.
