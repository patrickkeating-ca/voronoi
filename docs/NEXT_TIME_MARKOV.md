# Next time: playing up the Markov chain

> **Status: implemented** (branch `sandbox/markov`). Item 1 landed as the
> "stays ~N days" figure on the regime cards + a note under the transition
> matrix; item 2 landed as the observed-vs-steady-state-π comparison table
> in the same collapsible. Item 2's open questions resolved as: separate
> comparison table (not a 7th matrix row); power iteration seeded from the
> observed distribution (avoids an absorbing-state artifact for unobserved
> regimes), up to 5,000 steps with an L1 tolerance of 1e-9, rendering "—"
> on non-convergence. The skip reminder below was honored — no forecast
> framing anywhere. Kept as a record, same as the other archived docs.

`voronoi-regime.html`'s "Regime transition matrix" (`computeTransitionCounts()`
/ `renderTransitionMatrix()`) is already an empirical first-order Markov
chain transition matrix — P(tomorrow's regime | today's regime), estimated
from real day-over-day sequence data — it's just never labeled as one. The
robo page's "cross-regime reassignment matrix" is explicitly *not* one (no
time axis for clients, a static cross-tab over overlay scenarios, already
called out in `docs/NEXT_TIME.md`). Two ideas for making the Markov-chain
framing explicit and more useful, both building on data already computed.

## 1. Expected regime duration (cheap, do this first)

The transition matrix's diagonal (`p_ii`, each regime's self-transition
probability) already implies an **expected sojourn time**: `1 / (1 - p_ii)`
trading days. E.g. a 56% diagonal for Shock Selloff implies an expected
~2.3-day stay; a 98% diagonal for Deep Inversion implies ~50 days. This is
a classic, illuminating Markov-chain-native stat — "shocks are brief, calm
regimes are sticky," quantified — and it's a pure derivation from
`computeTransitionCounts()`'s existing output, no new data pipeline needed.

Implementation sketch:
- `expectedDuration(p_ii) { return 1 / (1 - p_ii); }`, guarding the `p_ii
  === 1` edge case (no observed self-transition-off yet — clamp or show
  "∞"/"—" rather than dividing by zero).
- Surface per-regime in the sidebar cards (`renderCards()`, e.g. next to
  "N days total") and/or as a labeled note under the transition matrix
  itself ("expected duration once in this regime: ~N trading days").
- Recompute wherever `renderTransitionMatrix()` already gets called
  (`classifyDays()`'s callers, seed drag, theme toggle) — same refresh
  wiring, no new triggers needed.
- **Caveat to write into the copy, not just internally**: this number only
  means what it says if the process is genuinely memoryless (transitions
  depend only on today, not the deeper history) — real market regimes
  probably aren't perfectly Markovian, so frame it as "implied by this
  transition matrix," not a rigorous forecast. Same skeptical-caveat
  convention as the return backtests' docs.

## 2. Stationary distribution projection (bigger, more speculative)

Compute the transition matrix's stationary distribution π (via power
iteration on the 6x6 matrix — repeatedly multiply a uniform starting
vector by the matrix until it converges, no need for a full eigenvector
solver) and compare it to the *actual* observed historical distribution
(already shown per-regime in the sidebar cards' day counts, and in
`docs/BACKTEST.md`'s "Regime balance" section for the 8-year window).

The interesting question this answers: if the current transition dynamics
just kept running forever, where does the system converge — and does that
match what's actually been observed? A big gap between π and the observed
distribution would be a real, honest signal that the chain hasn't reached
steady-state yet (plausible over a 3-year window) or that the transition
probabilities themselves are drifting over time (violating the
time-homogeneous assumption baked into "a single transition matrix"
in the first place).

Open questions to resolve before implementing (worth a `/plan` pass of its
own, not a copy-paste extension like item 1):
- Where does this render — a 7th "stationary" row/column on the existing
  matrix, or a separate small comparison table (π vs. observed %)?
- Convergence check: how many power-iteration steps is "enough," and what
  should happen in the render if the matrix is periodic/doesn't converge
  cleanly (unlikely with real data but worth guarding)?
- This is the more speculative of the two — lower confidence it earns its
  complexity vs. item 1's cheap, self-contained payoff.

## Skip reminder

Same reasoning as `docs/NEXT_STEPS.md`/`docs/NEXT_TIME.md`'s prior
"explicitly skipped" sections: don't let either of these motivate adding a
real forecasting/prediction feature (e.g. "next regime probability" as a
headline call-to-action) — the whole point of this project is legibility
("here's the pattern"), not a trading signal, and the docs' existing
skeptical-caveat convention exists precisely to keep that line clear.
