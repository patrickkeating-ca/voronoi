# Client stories: what journey mode actually found

`voronoi-robo.html`'s client journey mode (click any client dot, or type an
id into the "client #" jump box) walks one synthetic client through every
real trading day since mid-2023, showing which model portfolio they'd have
been reassigned to as the real VIX/yield-curve regime moved, and what that
reassignment would have been worth in real SPY/AGG/GLD/BIL/VNQ returns.
This doc is the plain-language write-up of what that turned up — written so
it can be explained and defended without a finance or stats background.

Reproduce every number here with:

```
node scripts/fetch-returns-data.js
node scripts/client-stories.js
```

## The headline number

Across all **320** synthetic clients, backtested against the real 3-year
window (2023-07-19 → 2026-07-14):

- **Zero** clients ended up ahead from being reassigned by the regime
  overlay instead of just sitting still.
- The average client who got touched at all **lost 3.3 points** of total
  return by being "helped."
- **187 of 320** (58%) never got reassigned at all — the overlay simply
  didn't reach them.
- The worst case lost **31 points** of return.

That's the sentence to lead with: the tool is honest about a system that,
in this specific backtest, never once paid off for the people it moved.

## Three stories, three different reasons it backfires

Each of these is a different *mechanism*, not the same bug three times —
that's what makes the case that this is structural, not a fluke.

### Client #264 — "playing defense doesn't mean less growth exposure"

Home portfolio: **Balanced**. Every time the market turned scary (Elevated
Vol, Deep Inversion, Shock Selloff — the regimes meant to trigger *more*
caution), this client got moved into **Growth (short horizon)** instead of
somewhere safer.

**Why:** the model only has two facts about a client — risk tolerance and
time horizon. This client's horizon (10.6 years) happens to sit much closer
to the "growth, short horizon" portfolio's 7-year target than to Balanced's
18-year target. Once a de-risking shift pulls Balanced's risk coordinate
away, geometry — not risk logic — hands the client to a growth fund
instead.

**Cost: −9.9 points** versus doing nothing.

### Client #174 — "a photo finish that flips your whole portfolio"

Home portfolio: **Growth (short horizon)**. A barely-there shift —
Goldilocks Steepening, a mild +2 nudge meant to represent a calm, healthy
market — was enough to flip this client into **Capital Preservation**, the
single most conservative option on the map, for 200 of 744 trading days
(27% of the whole window).

**Why:** this client sits almost exactly equidistant between the two
portfolios in the model's 2D space. The smallest push in either direction
decides it — there's no margin, so a "mild positive" market signal has an
outsized, all-or-nothing effect on this one client.

**Cost: −30.9 points** — the single worst outcome of all 320 clients.

### Client #0 — "de-risking made them more aggressive"

Home portfolio: **Income & Stability** (30% equity). During **Shock
Selloff** — the single most extreme, scariest regime the model recognizes,
with the largest de-risking shift of any overlay (−20 points of risk) —
this client got reassigned into **Balanced**, which holds **55% equity**.

**Why:** de-risking shifts *every* portfolio's risk coordinate down at
once, including the ones already below the client. If the client was
already near the low end, shifting everything down can put them closer to
a *higher*-equity portfolio than the one they started in, because that
portfolio moved down into range while their own home portfolio moved out
of it.

**Cost: −10.5 points** — during the exact regime the system exists to
protect people from.

## A one-line thesis you can defend in a room

> The model isn't wrong about reading the market — the VIX/yield-curve
> classification is real and does its job. It's wrong about what to *do*
> with that information for an individual client, because collapsing a
> person down to two coordinates (risk, horizon) throws away the context —
> like "this person needs their money in six months" — that should have
> overridden the market signal.

## How to check any of this yourself, live

Open `voronoi-robo.html`, type a client number into the "client #" box next
to the map, and hit **go**. The strip shows every day of their history
color-coded by assigned portfolio; scrub or hit play to watch the main map
morph along with it; the equity chart underneath shows the static-vs-adaptive
dollar outcome with a shared playhead. Client IDs **264**, **174**, and
**0** reproduce the three stories above exactly.

## Caveats (read before you over-claim this)

- **Synthetic clients, real market data.** The 320 clients' risk/horizon
  coordinates are made up; the VIX/yield-curve regime history and the
  SPY/AGG/GLD/BIL/VNQ returns applied to them are real. The *stories* are
  about how the classification geometry behaves, not about real people.
- **One 3-year window.** Same caveat as `docs/RETURNS_BACKTEST.md` and
  `docs/ROBO_RETURNS_BACKTEST.md` — no transaction costs, taxes, or
  slippage, and a different 3-year period could tell a different story.
  The *mechanism* (2D distance ignoring context) is structural and would
  recur in any window; the exact point totals would not.
- **"Zero clients benefited" is a property of this window and this seed
  layout**, not a mathematical law — a different set of six portfolios, or
  a different multi-year period with different regime transitions, could
  produce at least some winners. Reproduce the script before repeating the
  "zero" number in a context where someone might fact-check it against a
  different period.
