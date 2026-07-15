# Backtest: does the nearest-seed regime classifier hold up?

`backtest.js` runs the exact classifier from `voronoi-regime.html` (same 6
seeds, same domain, same 0.05 contestable-margin threshold) against 8 years
of real FRED data (`VIXCLS`, `T10Y2Y`, 2018-07 -> 2026-07, 1,994 trading
days) and checks it against six known volatility/curve events. Reproduce
with:

```
node --env-file=.env fetch-data.js 8 backtest-data
node backtest.js
```

## Headline result: severity gets flattened

Every real crisis in the window — COVID (VIX 82.7), the Apr 2025 tariff
shock (52.3), Aug 2024 carry unwind (38.6), the Jun 2022 hiking-cycle spike
(34.0) — gets classified as the same regime: **Shock Selloff**. The seed for
that regime sits at VIX 42; nearest-neighbor has no way to distinguish "worst
single day since 2008" from "a rough week," because there's only one seed to
absorb the entire right tail. A third axis (credit spreads would be the
obvious candidate) or a second high-vol seed is what's missing — this is
exactly the failure mode the original recommendation predicted, and the data
confirms it directly.

## The 2019 inversion — the one that got away

This is the more interesting miss. 2019's inversion is real and well-known,
but it was *shallow* — the 10Y-2Y slope only touched -0.04%, nowhere near
the "Deep Inversion, Calm" seed at -0.85 or even "Inversion Fading" at
-0.30. Result: 47 of 52 days in the Aug-Oct 2019 window classify as **Melt-Up
/ Ultra Calm**, not any inversion regime at all — on the actual day the
curve first went negative and every financial outlet ran the headline. The
classifier isn't wrong about VIX being low (11-14 the whole window), but it's
completely insensitive to the sign of the slope crossing zero, because both
inversion seeds are anchored far past where 2019 ever went. A framework built
to flag "we're near an inversion" needs a seed positioned near zero, not just
at the extremes.

## Turning-point days as an early-warning signal: works half the time

Comparing the contestable-day rate in the 10 trading days *before* each event
to the 31% baseline:

| Event | 10 days before | During | Baseline |
|---|---|---|---|
| COVID crash | **60%** | 8% | 31% |
| Apr 2025 tariff shock | **60%** | 22% | 31% |
| 2019 near-inversion | 50% | 48% | 31% |
| 2022 hiking-cycle onset | 10% | 13% | 31% |
| Aug 2024 vol spike | 0% | 19% | 31% |
| Mar 2026 vol event | 0% | 10% | 31% |

Two of the four real shocks (COVID, Apr 2025) show a real pre-event spike in
"fragile classification" days — plausibly useful. The other two (Aug 2024,
2022) show nothing, or even a lull. That's not a reliable leading indicator
on this sample — worth flagging honestly rather than cherry-picking the two
hits.

## The "regime" label is choppier than it sounds

Average regime run length across 8 years: **10.9 trading days (~2 weeks)**,
with 182 transitions total (22.8/year — roughly one every 2.3 weeks). The
sidebar/ledger language ("current regime," "days in current regime") implies
something that persists for a season; the actual data flips classification
roughly biweekly. That's a UX-and-substance issue as much as a modeling one
— the tool should probably smooth the daily point (e.g. a rolling average,
which is already what the mock-data generator did) before quoting "current
regime," or reframe the copy to be honest about the noise.

## Regime balance

"Elevated Vol, Growth Scare" absorbs 35.6% of all 8 years of history — far
more than any other bucket — acting as a catch-all for "somewhat elevated,"
while "Shock Selloff" (4.9%) and "Deep Inversion, Calm" (8.0%) are thin.
Seed placement done from a 3-year window (as the live map's seeds were)
doesn't generalize cleanly to 8 years; if this classifier were meant to run
against full history, the seeds would need re-fitting against that longer
window, not just the recent one.

## Bottom line

The core geometric idea — nearest-seed classification as a fast, legible way
to say "today looks like X" — holds up as a *visualization*. As a *signal*,
this backtest shows real, specific gaps: it collapses tail severity, misses
a well-known shallow inversion by construction, and its "current regime"
framing overstates persistence that isn't there in the daily data. None of
that means the live map is wrong to exist — a directionally right classifier
that surfaces "you are here, roughly" is legitimately useful for triage. It's
not, as-is, something you'd wire into an automated allocation trigger without
addressing the findings above first.
