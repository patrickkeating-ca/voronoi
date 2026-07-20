# Exploration idea: 3D mapping (VIX × yield-curve slope × return)

Not started — a speculative direction raised while discussing the client
journey mode, kept here so it isn't lost. Hypothetical, not committed to.

## The idea

Extend the regime map's two axes (VIX, 10Y-2Y slope) with a third: forward
return (or the classified regime's realized outcome). Either a 3D scatter
of trading days, or a surface, letting you see whether return clusters by
regime the way the 2D classification implies it should.

## d3 vs. Python — which tool

**d3 is a 2D library.** True 3D means either faking depth via projection
math by hand, or pulling in `three.js` and wiring it to d3's data-binding —
in effect, learning and maintaining a second rendering engine, not "adding
an axis."

**Python (`plotly`, or `matplotlib`'s `mplot3d`) has real 3D scatter/surface
plots out of the box** — camera rotation, hover tooltips, colormaps — in
maybe 20 lines. `plotly` can export to a single self-contained static HTML
file, so it doesn't have to mean "now this project needs a server."

**Recommendation:** prototype in Python/plotly first as a throwaway static
export. Treat it as a "does the third dimension actually reveal something a
2D plot plus a color/size encoding doesn't already show" experiment. Only
port to d3/three.js if it earns its keep — a rotatable 3D scatter is a
bigger engineering lift than a 2D Voronoi map with return mapped to dot
color or size, and needs to clearly teach something the cheaper version
can't.

## Where it'd live

See the separate best-practices note (asked and answered in conversation,
not repeated here) — leaning toward a separate project folder for the
Python prototyping, reading this repo's already-committed real-data
snapshots (`data/regime-data.js` / `.json`, `data/returns-data.js` / `.json`)
as input, keeping this repo's own identity (self-contained, no-build-step,
`file://`-openable) untouched unless/until something graduates to a real d3
page here.

## Open questions if this gets picked up

- What counts as "return" for a given day — same-day, forward N-day, or the
  regime-tilt backtest's realized outcome for that regime?
- Does a static rotatable view actually communicate more than the existing
  2D map + a `docs/CLIENT_STORIES.md`-style written finding? (The client
  stories work suggests specific, explainable numbers may land harder than
  a prettier visualization — worth weighing before investing here.)
