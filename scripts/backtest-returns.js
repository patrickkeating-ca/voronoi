// Simulates two hypothetical portfolios over real market history and prints
// how much difference "rebalance by regime" actually made:
//   - static:   buy-and-hold, weights fixed at whatever the classified
//               regime's tilt was on day 1, never rebalanced again
//   - adaptive: rebalanced every trading day to match *that day's*
//               classified regime's tilt (equity/bond/gold/cash)
// Both are driven by the same real VIX/curve-slope classifier as
// voronoi-regime.html (duplicated below, same seeds/domain) and real
// SPY/AGG/GLD/BIL adjusted-close returns (data/returns-data.json, from
// scripts/fetch-returns-data.js). Run with:
//   node scripts/fetch-returns-data.js        (once, to fetch)
//   node scripts/backtest-returns.js

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

// ---------- identical to the "USING_REAL_DATA" branch in voronoi-regime.html ----------
const REGIMES = [
  { name: "Deep Inversion, Calm",       vix: 13, slope: -0.85, tilt: { equity: 45, bond: 35, gold: 10, cash: 10 } },
  { name: "Inversion Fading",           vix: 15, slope: -0.30, tilt: { equity: 55, bond: 30, gold: 8,  cash: 7  } },
  { name: "Goldilocks Steepening",      vix: 14, slope:  0.40, tilt: { equity: 68, bond: 20, gold: 4,  cash: 8  } },
  { name: "Elevated Vol, Growth Scare", vix: 22, slope:  0.55, tilt: { equity: 45, bond: 25, gold: 12, cash: 18 } },
  { name: "Shock Selloff",              vix: 42, slope:  0.50, tilt: { equity: 20, bond: 25, gold: 25, cash: 30 } },
  { name: "Melt-Up / Ultra Calm",       vix: 12, slope:  0.15, tilt: { equity: 78, bond: 12, gold: 0,  cash: 10 } },
];
const DOMAIN_X = [10, 55];
const DOMAIN_Y = [-1.05, 0.85];
const ASSET_KEYS = ["equity", "bond", "gold", "cash"];

function distSq(x1, y1, x2, y2) {
  const dx = (x1 - x2) / (DOMAIN_X[1] - DOMAIN_X[0]);
  const dy = (y1 - y2) / (DOMAIN_Y[1] - DOMAIN_Y[0]);
  return dx * dx + dy * dy;
}
function classify(vix, slope) {
  let best = 0, bestD = Infinity;
  REGIMES.forEach((r, i) => {
    const d = distSq(vix, slope, r.vix, r.slope);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

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
  const regimeIdx = classify(r.vix, r.slope);
  return { date, vix: r.vix, slope: r.slope, regimeIdx, ret: returnsByDate.get(date) };
});

// ---------- static: buy-and-hold at day-1's regime tilt, never rebalanced ----------
const startTilt = REGIMES[days[0].regimeIdx].tilt;
const staticHoldings = {};
ASSET_KEYS.forEach((k) => { staticHoldings[k] = startTilt[k] / 100; });
const staticSeries = [1];
days.forEach((d) => {
  ASSET_KEYS.forEach((k) => { staticHoldings[k] *= 1 + d.ret[k]; });
  const total = ASSET_KEYS.reduce((sum, k) => sum + staticHoldings[k], 0);
  staticSeries.push(total);
});

// ---------- adaptive: rebalanced daily to the day's classified regime tilt ----------
let adaptiveValue = 1;
let rebalanceCount = 0;
let prevRegimeIdx = days[0].regimeIdx;
const adaptiveSeries = [1];
days.forEach((d) => {
  if (d.regimeIdx !== prevRegimeIdx) { rebalanceCount++; prevRegimeIdx = d.regimeIdx; }
  const tilt = REGIMES[d.regimeIdx].tilt;
  const dayReturn = ASSET_KEYS.reduce((sum, k) => sum + (tilt[k] / 100) * d.ret[k], 0);
  adaptiveValue *= 1 + dayReturn;
  adaptiveSeries.push(adaptiveValue);
});

function stats(series) {
  const total = series[series.length - 1] / series[0] - 1;
  const years = days.length / 252;
  const cagr = Math.pow(series[series.length - 1] / series[0], 1 / years) - 1;
  let peak = series[0], maxDD = 0;
  series.forEach((v) => { peak = Math.max(peak, v); maxDD = Math.min(maxDD, v / peak - 1); });
  return { total, cagr, maxDD };
}

const staticStats = stats(staticSeries);
const adaptiveStats = stats(adaptiveSeries);
const years = days.length / 252;

console.log("=".repeat(72));
console.log("BACKTEST: regime-adaptive vs. static tilt, real SPY/AGG/GLD/BIL returns");
console.log(days[0].date + " -> " + days[days.length - 1].date + " (" + years.toFixed(1) + " years, " + days.length + " trading days)");
console.log("=".repeat(72));

console.log("\n-- Static (buy-and-hold at day-1 regime: " + REGIMES[days[0].regimeIdx].name + ") --");
console.log("  Total return: " + (100 * staticStats.total).toFixed(1) + "%");
console.log("  CAGR: " + (100 * staticStats.cagr).toFixed(1) + "%");
console.log("  Max drawdown: " + (100 * staticStats.maxDD).toFixed(1) + "%");

console.log("\n-- Regime-adaptive (rebalanced daily to classified regime's tilt) --");
console.log("  Total return: " + (100 * adaptiveStats.total).toFixed(1) + "%");
console.log("  CAGR: " + (100 * adaptiveStats.cagr).toFixed(1) + "%");
console.log("  Max drawdown: " + (100 * adaptiveStats.maxDD).toFixed(1) + "%");
console.log("  Regime changes (rebalance triggers): " + rebalanceCount + " (" + (rebalanceCount / years).toFixed(1) + "/year)");

console.log("\n-- Headline --");
const deltaPts = 100 * (adaptiveStats.total - staticStats.total);
console.log("  Regime-adaptive " + (deltaPts >= 0 ? "beat" : "trailed") + " static buy-and-hold by " +
  Math.abs(deltaPts).toFixed(1) + " points of total return over " + years.toFixed(1) + " years.");
console.log("  (Ignores transaction costs, taxes, and slippage -- see docs/RETURNS_BACKTEST.md.)");

// ---------- write a headline summary snapshot the live page can load ----------
const summary = {
  generatedAt: new Date().toISOString(),
  range: { start: days[0].date, end: days[days.length - 1].date, years, tradingDays: days.length },
  startRegime: REGIMES[days[0].regimeIdx].name,
  rebalanceCount,
  static: staticStats,
  adaptive: adaptiveStats,
};
const outDir = path.join(__dirname, "..", "data");
fs.writeFileSync(path.join(outDir, "returns-backtest-summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, "returns-backtest-summary.js"), "window.RETURNS_BACKTEST_SUMMARY = " + JSON.stringify(summary) + ";\n");

console.log("\n" + "=".repeat(72));
