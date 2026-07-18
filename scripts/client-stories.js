// Asks a fleet-level version of scripts/backtest-robo-returns.js's question:
// not "would the 6 portfolios' own seed positions have done better
// reassigned?" but "would each of voronoi-robo.html's 320 *scattered*
// synthetic clients have done better?" Duplicates the same client-generation
// RNG voronoi-robo.html uses (so client #N here is the same client #N you
// see/select on the live page) plus the regime classifier and overlay shifts
// (same duplication pattern as backtest-robo-returns.js -- see "Cross-file
// coupling" in CLAUDE.md), then for every client walks every real trading
// day and compares:
//   - static:   buy-and-hold their neutral-regime home portfolio's alloc
//   - adaptive: reassigned daily to whichever portfolio they're nearest to
//               once that day's real classified regime's overlay shift is
//               applied to all six seeds
// Prints a fleet-wide headline, a full edge leaderboard, and a detailed
// regime-by-regime breakdown for the three clients written up in
// docs/CLIENT_STORIES.md.
// Run with:
//   node scripts/fetch-returns-data.js        (once, to fetch)
//   node scripts/client-stories.js

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

// ---------- identical to voronoi-robo.html's portfolios ----------
const PORTFOLIOS = [
  { id: 0, name: "Capital Preservation",   risk: 10, horizon: 6,  alloc: { equity: 15, bond: 65, cash: 15, alt: 5  } },
  { id: 1, name: "Income & Stability",     risk: 24, horizon: 24, alloc: { equity: 30, bond: 55, cash: 10, alt: 5  } },
  { id: 2, name: "Balanced",               risk: 50, horizon: 18, alloc: { equity: 55, bond: 35, cash: 5,  alt: 5  } },
  { id: 3, name: "Growth (short horizon)", risk: 63, horizon: 7,  alloc: { equity: 65, bond: 25, cash: 5,  alt: 5  } },
  { id: 4, name: "Growth (long horizon)",  risk: 58, horizon: 32, alloc: { equity: 70, bond: 20, cash: 0,  alt: 10 } },
  { id: 5, name: "Aggressive Growth",      risk: 89, horizon: 20, alloc: { equity: 90, bond: 0,  cash: 0,  alt: 10 } },
];
PORTFOLIOS.forEach((p) => { p.baseRisk = p.risk; });
const ASSET_KEYS = ["equity", "bond", "cash", "alt"];

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
const REGIME_OVERLAYS = [
  { name: "Melt-Up / Ultra Calm",       shift:   6 },
  { name: "Goldilocks Steepening",      shift:   2 },
  { name: "Inversion Fading",           shift:   0 },
  { name: "Elevated Vol, Growth Scare", shift:  -8 },
  { name: "Deep Inversion, Calm",       shift: -12 },
  { name: "Shock Selloff",              shift: -20 },
];
function shiftForRegime(regimeIdx) {
  return REGIME_OVERLAYS.find((o) => o.name === REGIME_SEEDS[regimeIdx].name).shift;
}

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

// ---------- identical to voronoi-robo.html's client-generation RNG ----------
// same seed (20260714) and same call order, so client #N here is client #N
// on the live page
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260714);
function gauss() {
  const u = 1 - rng(), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const CLIENTS = [];
const N = 320;
for (let i = 0; i < N; i++) {
  const home = Math.floor(rng() * PORTFOLIOS.length);
  const p = PORTFOLIOS[home];
  const spreadR = 14 + rng() * 10;
  const spreadH = 6 + rng() * 5;
  CLIENTS.push({
    id: i,
    risk: clamp(p.risk + gauss() * spreadR, 1, 99),
    horizon: clamp(p.horizon + gauss() * spreadH, 0.5, 35.5),
  });
}

// ---------- load real history ----------
const regimeData = JSON.parse(fs.readFileSync(regimePath, "utf8")).days;
const returnsData = JSON.parse(fs.readFileSync(returnsPath, "utf8")).days;
const regimeByDate = new Map(regimeData.map((d) => [d.date, d]));
const returnsByDate = new Map(returnsData.map((d) => [d.date, d.ret]));
const dates = returnsData.map((d) => d.date).filter((d) => regimeByDate.has(d)).sort();
if (dates.length < 30) {
  console.error("Fewer than 30 overlapping trading days -- can't backtest.");
  process.exit(1);
}
const years = dates.length / 252;
const days = dates.map((date) => {
  const r = regimeByDate.get(date);
  const regimeIdx = classifyRegime(r.vix, r.slope);
  const shift = shiftForRegime(regimeIdx);
  return {
    date,
    regimeName: REGIME_SEEDS[regimeIdx].name,
    ret: returnsByDate.get(date),
    shiftedPortfolios: PORTFOLIOS.map((p) => ({ risk: clamp(p.baseRisk + shift, 1, 99), horizon: p.horizon })),
  };
});

// ---------- walk every client through real history ----------
function journeyFor(client) {
  const neutral = PORTFOLIOS.map((p) => ({ risk: p.baseRisk, horizon: p.horizon }));
  const homeIdx = classifyClient(client.risk, client.horizon, neutral);
  const homeAlloc = PORTFOLIOS[homeIdx].alloc;

  let staticValue = 1, adaptiveValue = 1, reassignedDays = 0;
  const visited = new Set();
  const byRegime = {};
  days.forEach((d) => {
    const assignedIdx = classifyClient(client.risk, client.horizon, d.shiftedPortfolios);
    visited.add(assignedIdx);
    if (assignedIdx !== homeIdx) reassignedDays++;
    const key = d.regimeName + " -> " + PORTFOLIOS[assignedIdx].name;
    byRegime[key] = (byRegime[key] || 0) + 1;

    const staticRet = ASSET_KEYS.reduce((s, k) => s + (homeAlloc[k] / 100) * d.ret[k], 0);
    const adaptiveRet = ASSET_KEYS.reduce((s, k) => s + (PORTFOLIOS[assignedIdx].alloc[k] / 100) * d.ret[k], 0);
    staticValue *= 1 + staticRet;
    adaptiveValue *= 1 + adaptiveRet;
  });

  return {
    id: client.id,
    risk: client.risk,
    horizon: client.horizon,
    homeIdx,
    homeName: PORTFOLIOS[homeIdx].name,
    days: days.length,
    reassignedDays,
    reassignedPct: Math.round((100 * reassignedDays) / days.length),
    distinctVisited: visited.size,
    staticTotal: staticValue - 1,
    adaptiveTotal: adaptiveValue - 1,
    edgePts: 100 * (adaptiveValue - staticValue),
    byRegime,
  };
}

const results = CLIENTS.map(journeyFor);

console.log("=".repeat(88));
console.log("CLIENT STORIES: all 320 voronoi-robo.html clients, static vs. reassigned-by-real-regime");
console.log(days[0].date + " -> " + days[days.length - 1].date + " (" + years.toFixed(1) + " years, " + days.length + " trading days)");
console.log("=".repeat(88));

const edges = results.map((r) => r.edgePts);
const mean = edges.reduce((a, b) => a + b, 0) / edges.length;
const neverReassigned = results.filter((r) => r.reassignedPct === 0).length;
const everBenefited = results.filter((r) => r.edgePts > 0.05).length;

console.log("\n-- Fleet headline --");
console.log("  Mean edge across all 320 clients: " + mean.toFixed(2) + " points");
console.log("  Range: " + Math.min(...edges).toFixed(1) + " to +" + Math.max(...edges).toFixed(1) + " points");
console.log("  Clients never reassigned at all: " + neverReassigned + " / " + results.length);
console.log("  Clients who ended up ahead from reassignment: " + everBenefited + " / " + results.length);

console.log("\n-- Worst 10 (reassignment hurt most) --");
results.slice().sort((a, b) => a.edgePts - b.edgePts).slice(0, 10).forEach((r) => {
  console.log("  #" + String(r.id).padStart(3, "0") + " " + r.homeName.padEnd(24) +
    "edge " + r.edgePts.toFixed(1).padStart(7) + "pt   reassigned " + (r.reassignedPct + "%").padStart(4) +
    "   visited " + r.distinctVisited + "/6");
});

console.log("\n-- Best 10 (reassignment helped most, or at least didn't hurt) --");
results.slice().sort((a, b) => b.edgePts - a.edgePts).slice(0, 10).forEach((r) => {
  console.log("  #" + String(r.id).padStart(3, "0") + " " + r.homeName.padEnd(24) +
    "edge " + r.edgePts.toFixed(1).padStart(7) + "pt   reassigned " + (r.reassignedPct + "%").padStart(4) +
    "   visited " + r.distinctVisited + "/6");
});

// ---------- detailed regime-by-regime breakdown for the three flagged stories ----------
const FLAGGED = [264, 174, 0];
console.log("\n" + "=".repeat(88));
console.log("Detailed breakdown for the three clients written up in docs/CLIENT_STORIES.md");
console.log("=".repeat(88));
FLAGGED.forEach((id) => {
  const r = results[id];
  console.log("\n--- Client #" + String(r.id).padStart(3, "0") + " ---");
  console.log("  risk " + r.risk.toFixed(1) + " / horizon " + r.horizon.toFixed(1) + "y -- home: " + r.homeName);
  console.log("  static " + (r.staticTotal * 100).toFixed(1) + "%  adaptive " + (r.adaptiveTotal * 100).toFixed(1) +
    "%  edge " + r.edgePts.toFixed(1) + "pt");
  Object.keys(r.byRegime).sort().forEach((k) => console.log("    " + k + " : " + r.byRegime[k] + " days"));
});

console.log("\n" + "=".repeat(88));
