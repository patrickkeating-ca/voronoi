# Return backtest: does rebalancing by regime actually pay off?

`scripts/backtest-returns.js` simulates two hypothetical portfolios over the
same 3-year real-data window `voronoi-regime.html` classifies (VIX ×
10Y-2Y slope, `data/regime-data.json`), using real daily returns for four
asset-class proxies fetched by `scripts/fetch-returns-data.js`:

| Tilt leg | Proxy | Source |
|---|---|---|
| equity | SPY | Yahoo Finance adjusted close |
| bond   | AGG | Yahoo Finance adjusted close |
| gold   | GLD | Yahoo Finance adjusted close |
| cash   | BIL | Yahoo Finance adjusted close |

Reproduce with:

```
node scripts/fetch-returns-data.js
node scripts/backtest-returns.js
```

## The two portfolios

- **Static** — buy-and-hold. Weights are set once, to whatever regime's
  tilt (`equity`/`bond`/`gold`/`cash`, from `voronoi-regime.html`'s
  `REGIME_SEEDS`) was classified on day 1 of the window, and never
  rebalanced again. This is the "a client's model portfolio, set and
  forgotten" baseline.
- **Regime-adaptive** — rebalanced every trading day to whatever regime is
  classified *that day*, using the exact nearest-seed classifier from
  `voronoi-regime.html` (same seeds, same VIX/slope domain). This is the
  "the overlay concept, taken literally and back-tested" case.

## Headline result (2023-07-18 → 2026-07-14, 3.0 years)

| | Total return | CAGR | Max drawdown |
|---|---|---|---|
| Static (Deep Inversion, Calm tilt) | 45.6% | 13.5% | -8.8% |
| Regime-adaptive | 66.5% | 18.8% | -7.0% |

Regime-adaptive beat static buy-and-hold by **20.9 points** of total return
over the window, with a shallower max drawdown, rebalancing 74 times (about
25/year, i.e. roughly every two weeks — consistent with the ~11-trading-day
average regime run length found in `docs/BACKTEST.md`'s longer 8-year
sample). Re-run the two scripts above periodically — the numbers will drift
as more real trading days accumulate.

## Why this number should be read skeptically

- **Day-1 dependency.** The static baseline is *whatever regime happened to
  be classified on day 1* of this particular window (here, "Deep Inversion,
  Calm" — a defensive tilt). A window starting in a different regime would
  give the static portfolio a different, possibly much stronger, baseline.
  This is a single draw, not an average over starting conditions.
- **No transaction costs, taxes, or slippage.** The adaptive portfolio
  rebalances daily to match the classified regime and 8x/year effectively;
  real-world trading costs and short-term capital gains would eat directly
  into the 20.9-point edge. This is a frictionless upper bound, not a
  realistic net-of-cost return.
- **Three-year sample.** Same seeds, same 3-year window that
  `docs/BACKTEST.md` already shows doesn't generalize well to a longer
  8-year history (missed 2019's shallow inversion, collapsed different vol
  spikes into one bucket). A backtest that inherits the classifier's known
  weaknesses inherits this one's blind spots too — the comparison hasn't
  been run against the same 8-year `backtest-data.json` window used
  elsewhere in this repo, since that returns data isn't fetched by default.
- **SPY/AGG/GLD/BIL total return via Yahoo's adjusted close**, not FRED —
  this is the one place in the repo that isn't FRED-sourced, because FRED no
  longer carries a spot gold price series. Yahoo's chart endpoint is
  unofficial and undocumented (no key, no published SLA); if it breaks,
  `scripts/fetch-returns-data.js` is the only place that needs fixing.
- **Daily rebalance to the classified regime is an idealization** — no real
  advisor re-tilts a book every time a nearest-neighbor classification flips
  overnight. It's the cleanest way to ask "if you trusted this classifier
  completely, what would it have been worth," not a proposed trading rule.

## Bottom line

Over this specific 3-year window, literally following the regime overlay
would have outperformed a "set it and forget it" static tilt, before costs.
That's a real, computed number — not hand-waved — but it's one window, one
starting condition, and one (already-known-imperfect) classifier. Treat it
as "the idea has a plausible edge worth testing further," not as evidence
this should drive real allocation decisions.
