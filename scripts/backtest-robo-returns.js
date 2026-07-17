// Backtests voronoi-robo.html's own portfolio allocs (equity/bond/cash/alt
// -- a different key set from the regime page's equity/bond/gold/cash tilt,
// see scripts/backtest-returns.js) against real market history. For each of
// the 6 model portfolios, treats a client sitting exactly at that
// portfolio's neutral seed position as a representative case, and compares:
//   - static:   buy-and-hold that portfolio's own alloc, never reassigned
//   - adaptive: reassigned every trading day to whichever portfolio the
//               representative client is nearest to once that day's real
//               classified regime's overlay shift is applied to all six
//               seeds (the client's own coordinates never move -- only the
//               seeds do, exactly matching voronoi-robo.html's
//               applyOverlay()/reclassifyClients() behavior)
// Run with:
//   node scripts/fetch-returns-data.js        (once, to fetch)
//   node scripts/backtest-robo-returns.js

const fs = require("fs");
const path = require("path");

const regimeBasename = process.argv[2] || "regime-data";
const returnsBasename = process.argv[3] || "returns-data";

const regimePath = path.join(__dirname, "..", "data", regimeBasename + ".json");
const returnsPath = path.join(__dirname, "..", "data", returnsBasename + ".json");
for (const p of [regimePath, returnsPath]) {
  if (!fs.existsSync(p)) {
    console.error("Missing " + path.relative(process.cwd(), p) + ". Run:");
    console.error("  node --env-file=.env scripts/fetch-data.js");
    console.error("  node scripts/fetch-returns-data.js");
    process.exit(1);
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---------- identical to voronoi-robo.html's REGIME_SEEDS/classifier ----------
const REGIME_SEEDS = [
  { name: "Deep Inversion, Calm",       vix: 13, slope: -0.85 },
  { name: "Inversion Fading",           vix: 15, slope: -0.30 },
  { name: "Goldilocks Steepening",      vix: 14, slope:  0.40 },
  { name: "Elevated Vol, Growth Scare", vix: 22, slope:  0.55 },
  { name: "Shock Selloff",              vix: 42, slope:  0.50 },
  { name: "Melt-Up / Ultra Calm",       vix: 12, slope:  0.15 },
];
const REGIME_DOMAIN_X = [10, 55], REGIME_DOMAIN_Y = [-1.05, 0.85];
function regimeDistSq(x1, y1, x2, y2) {
  const dx = (x1 - x2) / (REGIME_DOMAIN_X[1] - REGIME_DOMAIN_X[0]);
  const dy = (y1 - y2) / (REGIME_DOMAIN_Y[1] - REGIME_DOMAIN_Y[0]);
  return dx * dx + dy * dy;
}
function classifyRegime(vix, slope) {
  let best = 0, bestD = Infinity;
  REGIME_SEEDS.forEach((r, i) => {
    const d = regimeDistSq(vix, slope, r.vix, r.slope);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// ---------- identical to voronoi-robo.html's REGIME_OVERLAYS ----------
// (note: a different order from REGIME_SEEDS -- matched by name, not index,
// exactly as voronoi-robo.html's own defaultOverlayIdx lookup has to do)
const REGIME_OVERLAYS = [
  { name: "Melt-Up / Ultra Calm",       shift:   6 },
  { name: "Goldilocks Steepening",      shift:   2 },
  { name: "Inversion Fading",           shift:   0 },
  { name: "Elevated Vol, Growth Scare", shift:  -8 },
  { name: "Deep Inversion, Calm",       shift: -12 },
  { name: "Shock Selloff",              shift: -20 },
];
function shiftForRegime(regimeIdx) {
  const name = REGIME_SEEDS[regimeIdx].name;
  const ov = REGIME_OVERLAYS.find((o) => o.name === name);
  return ov.shift;
}

// ---------- identical to voronoi-robo.html's portfolios ----------
const PORTFOLIOS = [
  { id: 0, name: "Capital Preservation",   risk: 10, horizon: 6,  alloc: { equity: 15, bond: 65, cash: 15, alt: 5  } },
  { id: 1, name: "Income & Stability",     risk: 24, horizon: 24, alloc: { equity: 30, bond: 55, cash: 10, alt: 5  } },
  { id: 2, name: "Balanced",               risk: 50, horizon: 18, alloc: { equity: 55, bond: 35, cash: 5,  alt: 5  } },
  { id: 3, name: "Growth (short horizon)", risk: 63, horizon: 7,  alloc: { equity: 65, bond: 25, cash: 5,  alt: 5  } },
  { id: 4, name: "Growth (long horizon)",  risk: 58, horizon: 32, alloc: { equity: 70, bond: 20, cash: 0,  alt: 10 } },
  { id: 5, name: "Aggressive Growth",      risk: 89, horizon: 20, alloc: { equity: 90, bond: 0,  cash: 0,  alt: 10 } },
];
const ASSET_KEYS = ["equity", "bond", "cash", "alt"];

function portfolioDistSq(risk1, horizon1, risk2, horizon2) {
  const dx = (risk1 - risk2) / 100;
  const dy = (horizon1 - horizon2) / 36;
  return dx * dx + dy * dy;
}
function classifyClient(risk, horizon, shiftedPortfolios) {
  let best = 0, bestD = Infinity;
  shiftedPortfolios.forEach((p, i) => {
    const d = portfolioDistSq(risk, horizon, p.risk, p.horizon);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// ---------- load real history ----------
const regimeData = JSON.parse(fs.readFileSync(regimePath, "utf8")).days;
const returnsData = JSON.parse(fs.readFileSync(returnsPath, "utf8")).days;

const regimeByDate = new Map(regimeData.map((d) => [d.date, d]));
const returnsByDate = new Map(returnsData.map((d) => [d.date, d.ret]));
const dates = returnsData.map((d) => d.date).filter((d) => regimeByDate.has(d)).sort();

if (dates.length < 30) {
  console.error("Fewer than 30 overlapping trading days between " + regimeBasename + " and " + returnsBasename + " -- can't backtest.");
  process.exit(1);
}

const days = dates.map((date) => {
  const r = regimeByDate.get(date);
  const regimeIdx = classifyRegime(r.vix, r.slope);
  const shift = shiftForRegime(regimeIdx);
  const shiftedPortfolios = PORTFOLIOS.map((p) => ({
    risk: clamp(p.risk + shift, 1, 99),
    horizon: p.horizon,
  }));
  return { date, ret: returnsByDate.get(date), shiftedPortfolios };
});

function stats(series) {
  const total = series[series.length - 1] / series[0] - 1;
  const years = days.length / 252;
  const cagr = Math.pow(series[series.length - 1] / series[0], 1 / years) - 1;
  return { total, cagr };
}

const years = days.length / 252;
const results = PORTFOLIOS.map((home) => {
  // static: buy-and-hold home's own alloc for the whole window
  const staticSeries = [1];
  let staticValue = 1;
  days.forEach((d) => {
    const dayReturn = ASSET_KEYS.reduce((sum, k) => sum + (home.alloc[k] / 100) * d.ret[k], 0);
    staticValue *= 1 + dayReturn;
    staticSeries.push(staticValue);
  });

  // adaptive: reassigned daily to whichever portfolio the representative
  // client (fixed at home's own risk/horizon) is nearest once the day's
  // overlay shift is applied to all six seeds
  const adaptiveSeries = [1];
  let adaptiveValue = 1;
  let reassignedDays = 0;
  days.forEach((d) => {
    const assignedIdx = classifyClient(home.risk, home.horizon, d.shiftedPortfolios);
    if (assignedIdx !== home.id) reassignedDays++;
    const alloc = PORTFOLIOS[assignedIdx].alloc;
    const dayReturn = ASSET_KEYS.reduce((sum, k) => sum + (alloc[k] / 100) * d.ret[k], 0);
    adaptiveValue *= 1 + dayReturn;
    adaptiveSeries.push(adaptiveValue);
  });

  const staticStats = stats(staticSeries);
  const adaptiveStats = stats(adaptiveSeries);
  return {
    id: home.id,
    name: home.name,
    static: staticStats,
    adaptive: adaptiveStats,
    edgePts: 100 * (adaptiveStats.total - staticStats.total),
    reassignedPct: 100 * reassignedDays / days.length,
  };
});

console.log("=".repeat(88));
console.log("BACKTEST: voronoi-robo.html's own portfolio allocs, static vs. reassigned-by-regime-overlay");
console.log(days[0].date + " -> " + days[days.length - 1].date + " (" + years.toFixed(1) + " years, " + days.length + " trading days)");
console.log("=".repeat(88));

console.log("\n" + "Portfolio".padEnd(24) + "Static".padStart(10) + "Adaptive".padStart(10) + "Edge (pt)".padStart(11) + "Reassigned".padStart(12));
results.forEach((r) => {
  console.log(
    r.name.padEnd(24) +
    (100 * r.static.total).toFixed(1).padStart(9) + "%" +
    (100 * r.adaptive.total).toFixed(1).padStart(9) + "%" +
    (r.edgePts >= 0 ? "+" : "") + r.edgePts.toFixed(1).padStart(r.edgePts >= 0 ? 9 : 10) +
    r.reassignedPct.toFixed(0).padStart(11) + "%"
  );
});

const meanEdge = results.reduce((sum, r) => sum + r.edgePts, 0) / results.length;
const minEdge = Math.min(...results.map((r) => r.edgePts));
const maxEdge = Math.max(...results.map((r) => r.edgePts));

console.log("\n-- Headline --");
console.log("  Mean edge across all 6 portfolios: " + (meanEdge >= 0 ? "+" : "") + meanEdge.toFixed(1) + " points of total return");
console.log("  Range: " + minEdge.toFixed(1) + " to +" + maxEdge.toFixed(1) + " points (adaptive vs. static varies a lot by portfolio)");
console.log("  (Ignores transaction costs, taxes, and slippage -- see docs/ROBO_RETURNS_BACKTEST.md.)");

// ---------- write a headline summary snapshot the live page can load ----------
const summary = {
  generatedAt: new Date().toISOString(),
  range: { start: days[0].date, end: days[days.length - 1].date, years, tradingDays: days.length },
  portfolios: results,
  meanEdgePts: meanEdge,
  minEdgePts: minEdge,
  maxEdgePts: maxEdge,
};
const outDir = path.join(__dirname, "..", "data");
fs.writeFileSync(path.join(outDir, "robo-returns-backtest-summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, "robo-returns-backtest-summary.js"), "window.ROBO_RETURNS_BACKTEST_SUMMARY = " + JSON.stringify(summary) + ";\n");

console.log("\n" + "=".repeat(88));
