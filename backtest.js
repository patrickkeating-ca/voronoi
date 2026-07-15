// Backtests the nearest-seed regime classifier (same seeds, same domain, same
// contestable-margin threshold as voronoi-regime.html) against 8 years of
// real FRED data, and checks its behavior around known historical inflection
// points. Run with:
//   node --env-file=.env fetch-data.js 8 backtest-data   (once, to fetch)
//   node backtest.js

const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "data", "backtest-data.json");
if (!fs.existsSync(dataPath)) {
  console.error("Missing data/backtest-data.json. Run:");
  console.error("  node --env-file=.env fetch-data.js 8 backtest-data");
  process.exit(1);
}

// ---------- identical to the "USING_REAL_DATA" branch in voronoi-regime.html ----------
const regimes = [
  { id: 0, name: "Deep Inversion, Calm",       vix: 13, slope: -0.85 },
  { id: 1, name: "Inversion Fading",           vix: 15, slope: -0.30 },
  { id: 2, name: "Goldilocks Steepening",      vix: 14, slope:  0.40 },
  { id: 3, name: "Elevated Vol, Growth Scare", vix: 22, slope:  0.55 },
  { id: 4, name: "Shock Selloff",              vix: 42, slope:  0.50 },
  { id: 5, name: "Melt-Up / Ultra Calm",       vix: 12, slope:  0.15 },
];
const DOMAIN_X = [10, 55];
const DOMAIN_Y = [-1.05, 0.85];
const CONTESTABLE_MARGIN = 0.05;

function distSq(x1, y1, x2, y2) {
  const dx = (x1 - x2) / (DOMAIN_X[1] - DOMAIN_X[0]);
  const dy = (y1 - y2) / (DOMAIN_Y[1] - DOMAIN_Y[0]);
  return dx * dx + dy * dy;
}

const raw = JSON.parse(fs.readFileSync(dataPath, "utf8")).days;
const days = raw.map((d) => {
  const dists = regimes.map((r) => distSq(d.vix, d.slope, r.vix, r.slope));
  const order = dists.map((_, i) => i).sort((a, b) => dists[a] - dists[b]);
  const nearest = Math.sqrt(dists[order[0]]);
  const second = Math.sqrt(dists[order[1]]);
  return {
    date: d.date,
    vix: d.vix,
    slope: d.slope,
    cell: order[0],
    contestable: (second - nearest) < CONTESTABLE_MARGIN,
  };
});

// ---------- known historical inflection points ----------
const EVENTS = [
  {
    label: "2019 near-inversion",
    start: "2019-08-01", end: "2019-10-15",
    note: "10Y-2Y briefly went negative in Aug 2019 (by only a few bps) -- the famous 'shallow' inversion.",
  },
  {
    label: "COVID crash",
    start: "2020-02-19", end: "2020-04-30",
    note: "VIX peaked intraday ~82.7 on 2020-03-16 -- matches this dataset's all-time max.",
  },
  {
    label: "2022 hiking-cycle inversion onset",
    start: "2022-06-01", end: "2022-09-30",
    note: "Fed hiking cycle; 2Y yield first exceeded 10Y around early July 2022, and the curve stayed inverted into 2024.",
  },
  {
    label: "Aug 2024 vol spike",
    start: "2024-07-25", end: "2024-08-15",
    note: "Yen carry-trade unwind; VIX spiked to ~38.6 close on 2024-08-05.",
  },
  {
    label: "Apr 2025 tariff shock",
    start: "2025-03-25", end: "2025-04-25",
    note: "'Liberation Day' tariff announcement (2025-04-02) and the selloff that followed; VIX hit 52.3 on 2025-04-08.",
  },
  {
    label: "Mar 2026 vol event",
    start: "2026-03-20", end: "2026-04-05",
    note: "Vol spike present in the fetched data; no independent knowledge of the cause (outside this model's training cutoff).",
  },
];

function daysInRange(from, to) {
  return days.filter((d) => d.date >= from && d.date <= to);
}
function tradingDaysBefore(date, n) {
  const idx = days.findIndex((d) => d.date >= date);
  const start = Math.max(0, idx - n);
  return days.slice(start, idx);
}

// ---------- overall stats ----------
const overallContestablePct = (100 * days.filter((d) => d.contestable).length / days.length);
const perRegimeCounts = regimes.map((r) => days.filter((d) => d.cell === r.id).length);

let transitions = 0;
const runLengths = [];
let runStart = 0;
for (let i = 1; i <= days.length; i++) {
  if (i === days.length || days[i].cell !== days[i - 1].cell) {
    runLengths.push(i - runStart);
    if (i < days.length) transitions++;
    runStart = i;
  }
}
const avgRunLength = runLengths.reduce((a, b) => a + b, 0) / runLengths.length;
const years = (new Date(days[days.length - 1].date) - new Date(days[0].date)) / (365.25 * 24 * 3600 * 1000);

console.log("=".repeat(72));
console.log("BACKTEST: nearest-seed regime classifier vs. " + days.length + " real trading days");
console.log(days[0].date + " -> " + days[days.length - 1].date + " (" + years.toFixed(1) + " years)");
console.log("=".repeat(72));

console.log("\n-- Overall --");
console.log("Turning-point (contestable) days: " + overallContestablePct.toFixed(1) + "% of all days");
console.log("Regime transitions: " + transitions + " (" + (transitions / years).toFixed(1) + "/year)");
console.log("Average regime run length: " + avgRunLength.toFixed(1) + " trading days (~" + (avgRunLength / 21).toFixed(1) + " months)");
console.log("\nDays per regime (full 8-year history):");
regimes.forEach((r, i) => {
  console.log("  " + r.name.padEnd(30) + perRegimeCounts[i].toString().padStart(5) + "  (" + (100 * perRegimeCounts[i] / days.length).toFixed(1) + "%)");
});

console.log("\n-- Events --");
EVENTS.forEach((ev) => {
  const w = daysInRange(ev.start, ev.end);
  console.log("\n" + ev.label + "  [" + ev.start + " -> " + ev.end + "]");
  console.log("  " + ev.note);
  if (w.length === 0) {
    console.log("  no data in this window");
    return;
  }
  const regimeCounts = {};
  w.forEach((d) => { regimeCounts[d.cell] = (regimeCounts[d.cell] || 0) + 1; });
  const regimeSummary = Object.keys(regimeCounts)
    .sort((a, b) => regimeCounts[b] - regimeCounts[a])
    .map((id) => regimes[id].name + " (" + regimeCounts[id] + "d)")
    .join(", ");
  console.log("  classified as: " + regimeSummary);

  const inWindowPct = 100 * w.filter((d) => d.contestable).length / w.length;
  const lead = tradingDaysBefore(ev.start, 10);
  const leadPct = lead.length ? 100 * lead.filter((d) => d.contestable).length / lead.length : NaN;
  console.log("  turning-point days: " + inWindowPct.toFixed(0) + "% during event vs. " +
    (isNaN(leadPct) ? "n/a" : leadPct.toFixed(0) + "%") + " in the 10 days before vs. " +
    overallContestablePct.toFixed(0) + "% baseline");

  const peak = w.reduce((a, b) => (b.vix > a.vix ? b : a));
  console.log("  peak VIX in window: " + peak.vix.toFixed(1) + " on " + peak.date + " -> " + regimes[peak.cell].name);
});

console.log("\n" + "=".repeat(72));
