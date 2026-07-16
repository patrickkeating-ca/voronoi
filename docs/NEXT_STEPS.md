# Next steps (archived)

Carried over from the portfolio-polish triage — what's done vs. what's
still open, tiered by effort/impact. **All tiers are now resolved** (done
or explicitly skipped) — kept as a historical record of the triage
reasoning, not a live task list.

## Done tonight (Tier 1)

- Live demo: `index.html` landing page + both pages deployed via GitHub
  Pages (`main` branch).
- README hero screenshot + live-demo link.
- Fixed the deployed site silently falling back to synthetic data
  (`data/regime-data.js` now a committed exception to `.gitignore`).
- Scheduled `.github/workflows/refresh-data.yml` to keep that snapshot
  current automatically (daily + manual dispatch), needs the
  `FRED_API_KEY` repo secret set.

## Tier 2 — deepens the analytical story, moderate effort (done, `sandbox/analytical`)

- [x] **Soft/probabilistic classification.** `voronoi-regime.html` already
  computes nearest + second-nearest distance for "turning-point days" —
  extend that into a visible blend (e.g. "62% Elevated Vol / 38% Shock
  Selloff") instead of a hard label. Natural next step on work already
  done; signals more sophisticated quant thinking than winner-take-all
  nearest-neighbor.
- [x] **Regime transition matrix / persistence stats.** Reuses the backtest
  data already pulled (`docs/BACKTEST.md`) — tally a Markov-chain
  P(regime B | regime A) and render as a small heatmap. Cheap to compute.
- [x] **Tie robo-advisor tilts to real returns.** Simulate what a portfolio
  actually would have earned rebalancing by regime vs. staying static,
  using real equity/bond/gold/cash proxies (e.g. SPY/AGG/GLD/BIL, or a
  FRED total-return series). Highest-impact single addition — connects
  both pages' concepts into one number — but the most work: needs a new
  data source and a small backtest script.

## Tier 3 — worth doing, lower priority

- [x] **CI on push** — GitHub Action running `node --check`-equivalent
  syntax checks on both HTML files' inline scripts (via the new
  `scripts/check-inline-scripts.js`) + every `scripts/*.js` file, on every
  push/PR (`.github/workflows/ci.yml`). Done, `sandbox/ci`.
- **Axis picker / more macro dimensions** (credit spreads, dollar index)
  for the regime map — fun, but risks diluting the clean two-variable
  story that makes the Voronoi metaphor legible. Lowest priority.
  **Explicitly skipped** (decided when triaging Tier 3) for that same
  reason — the doc's own risk assessment held up on reflection.

## Explicitly skipped

Real-time/websocket updates, multi-user features — fight the
self-contained, no-backend identity that's the project's actual strength,
without portfolio payoff.
