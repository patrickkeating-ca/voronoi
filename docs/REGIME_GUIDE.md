# Plain-language guide to the market regimes

`voronoi-regime.html` puts every trading day on a 2D map and labels it with
whichever of six "regimes" it sits closest to. This doc explains what those
two axes mean, what each regime is really saying, and what (if anything) to
do about it. It's a companion to `docs/BACKTEST.md`, which is the "does this
actually hold up" version of this same story — the caveats below are pulled
from there, not re-derived.

## The two dials the map uses

- **VIX** — often called the market's "fear gauge." It measures how much
  price swing options traders are paying to protect against over the next
  30 days. Low VIX (roughly 12-15) means the market expects calm. High VIX
  (30+) means the market expects — or is already in — a rough stretch.
  It's a mood indicator, not a prediction of direction.
- **Yield curve slope (10Y-2Y)** — the difference between the interest rate
  on a 10-year government bond and a 2-year one. Normally, longer loans pay
  more interest than short ones (you're tying up money longer, so you
  expect more for it) — that's a *positive*, "steepening" slope. When
  short-term rates pay *more* than long-term ones, the slope goes
  *negative* — that's an **inversion**, and it's historically one of the
  more reliable recession warnings, because it means the market expects
  the central bank to be cutting rates in response to a weakening economy
  down the road.

The map's six "seeds" are just six reference points on this VIX-vs-slope
plane. Every day gets labeled with whichever seed it's nearest to — that's
all "nearest-seed classification" means: "which of these six reference
snapshots does today look most like?"

## The six regimes

### 1. Deep Inversion, Calm
**VIX ~13, slope ~-0.85** (yield curve deeply inverted, but markets aren't
panicking about it yet). Plain read: the bond market is flashing a real
recession warning, but stocks haven't caught on — or don't believe it yet.
Historically an uneasy calm, not a good one.
**Caveat:** the live map's inversion seeds are calibrated to a *deep*
inversion. A real, headline-making inversion can be much shallower than
this and get missed entirely (see the 2019 note under Inversion Fading).

### 2. Inversion Fading
**VIX ~15, slope ~-0.30** — the curve is still inverted but less deeply,
often as the market starts pricing in the recession-warning outcome (or the
central bank starting to cut). Not clearly good or bad on its own — it's a
transition state.
**Caveat, and this is a real, documented miss:** the 2019 yield curve
inversion — the one every financial outlet ran headlines about — only
touched -0.04%, nowhere near either inversion seed (-0.85 and -0.30). When
backtested against real history, 47 of 52 days in that window got
classified as "Melt-Up / Ultra Calm" instead of any inversion regime at
all. If the curve just barely dips negative, don't expect this map to flag
it — it's built to catch *deep* inversions, not the first crossing of zero.

### 3. Goldilocks Steepening
**VIX ~14, slope ~+0.40.** The name is a fairy-tale reference: not too hot,
not too cold, "just right." Calm volatility plus a normal, healthy-shaped
yield curve (long rates modestly above short rates). This is generally read
as a *good* regime — the market isn't stressed, and the curve shape doesn't
say a recession is being priced in. **This is where the map currently sits**
(as of the latest data snapshot, VIX 15.67 / slope +0.42) — and it's not a
close call; today is roughly four times closer to this seed than to the
next-nearest one.
**Caveat:** "good" here means "no acute stress signal," not "guaranteed
good times ahead." Calm regimes can end abruptly (see Shock Selloff).

### 4. Elevated Vol, Growth Scare
**VIX ~22, slope ~+0.55.** Volatility has picked up (options traders paying
more for protection) even though the curve shape still looks fine. Reads as
"markets are nervous about growth/earnings," short of full panic.
**Caveat:** in the 8-year backtest this bucket absorbed 35.6% of *all*
trading days — by far the largest share. It functions as a catch-all for
"somewhat elevated but not a full shock," so don't read too much precision
into it; it's a wide net, not a sharp signal.

### 5. Shock Selloff
**VIX ~42, slope ~+0.50.** High volatility, real fear, the market pricing
in near-term pain. Read as a *bad*, stressed regime.
**Caveat — this is the most important one on the whole page:** this single
seed has to represent the entire tail of history's worst days. In the
8-year backtest, COVID (VIX 82.7), the April 2025 tariff shock (52.3), the
August 2024 carry unwind (38.6), and the June 2022 hiking-cycle spike (34.0)
*all* get classified as this same one regime. The map can tell you "this is
bad," but it flattens "worst crash in a decade" and "a rough couple of
weeks" into the same label. Don't infer severity from the name alone.

### 6. Melt-Up / Ultra Calm
**VIX ~12, slope ~+0.15.** The lowest-volatility regime on the map — markets
very calm, curve mildly positive. Often coincides with strong, low-drama
rallies ("melt-up").
**Caveat:** very calm markets are sometimes calm because risk is being
under-priced, not because risk is genuinely low — a "too good to be true"
regime deserves the same skepticism as any other extreme.

## Terms used on the page

- **Contestable day** — a day almost exactly between two regimes (the
  distance to the 2nd-nearest seed is within 5% of the distance to the
  nearest). It's the map's own "this classification is a coin flip" flag —
  worth more attention than a day that's deep inside one regime.
- **Days since regime change** — how many trading days in a row today's
  classification has held. See the caveat below on how fast this can
  reset.
- **Voronoi cell / seed** — a "seed" is one of the six reference points;
  its "cell" is the region of the map (all VIX/slope combinations) closer
  to it than to any other seed. The colored regions on the map are these
  cells.
- **"Stays ~N days" (expected duration)** — how long a regime tends to
  last once entered, implied by how often history stayed in the same
  regime from one day to the next. E.g. Shock Selloffs historically
  resolve in ~2-3 trading days, while calm regimes persist for weeks.
  It's a historical average from this window, not a prediction — it
  assumes tomorrow only depends on today ("memoryless"), which real
  markets likely violate.
- **Steady-state π (stationary distribution)** — if the day-to-day
  transition patterns in this window ran forever, the share of time the
  market would eventually spend in each regime. Compared against the
  *actually observed* share: a big gap between the two is an honest
  warning that the window is too short to have settled, or that the
  transition patterns themselves are shifting over time.

## Caveats that apply across all six regimes

- **"Current regime" sounds like a season; it behaves like weather.** Across
  8 years of real data, the average regime lasted only 10.9 trading days
  (about two weeks), with a new transition roughly every 2.3 weeks. Don't
  read "we are in regime X" as a multi-month story — it can flip soon.
- **Severity gets flattened**, worst in Shock Selloff (above) but true in
  general: nearest-seed classification tells you *which* of six buckets
  you're closest to, not *how far into* that bucket's extreme you are.
- **A real signal can be missed if it's shallow** — demonstrated by the
  2019 inversion (see Inversion Fading above). The seeds were calibrated
  to a specific 3-year window and don't automatically generalize.
- **Some regimes are much more common than others** by construction (seed
  placement), not because the underlying economics are that lopsided.

## What to watch — and what to actually do

This tool is built to make "where are markets right now, roughly" legible
at a glance — it is **not** a forecasting or trading signal, and it isn't
wired into (nor intended to justify) an automated allocation decision. With
that in mind:

- **A regime label by itself is not a reason to act.** Treat it as a
  snapshot, not advice.
- **Do pay attention to "contestable" days** — they're the map's own way of
  saying "this classification is uncertain," which is more informative
  than the label itself in that moment.
- **Do notice how long you've been in the current regime** — a very long
  stay in one regime, or a rapid string of changes, is more interesting
  than the label in isolation.
- **Treat "Shock Selloff" as "something is stressed," not as a calibrated
  severity reading** — go check VIX and news directly if you need to know
  how bad, rather than trusting the bucket name.
- **Treat "no inversion regime showing" with mild skepticism** — a shallow,
  real inversion can hide inside "calm"-looking buckets, per the 2019 miss
  above.

If you're using this alongside `voronoi-robo.html`'s portfolio-tilt
backtest, read `docs/ROBO_RETURNS_BACKTEST.md` too — it found that, for the
robo page's specific seed layout, being reassigned across regimes was rare
enough that the regime label rarely changed a client's own portfolio
outcome much, a more skeptical finding than it might sound like at first.
