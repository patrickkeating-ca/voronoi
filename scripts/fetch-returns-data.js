// Pulls daily dividend/split-adjusted prices for the 5 asset-class proxies
// used by the two return backtests (SPY/AGG/GLD/BIL/VNQ, standing in for
// equity/bond/gold/cash/alt) from Yahoo Finance's unofficial chart endpoint,
// and writes a static JSON + <script>-includable JS file of daily returns. Run:
//   node scripts/fetch-returns-data.js [yearsBack] [outBasename]
// e.g. node scripts/fetch-returns-data.js 8 backtest-returns-data
//
// Yahoo's chart API is unofficial and undocumented (no key, no published
// SLA) -- the same endpoint the `yfinance` Python library scrapes. It's used
// here (rather than FRED, everywhere else in this repo) only because FRED no
// longer carries a spot gold price series; adjclose gives a real,
// dividend-adjusted total-return proxy for the other three legs too.

const fs = require("fs");
const path = require("path");

const YEARS_BACK = Number(process.argv[2]) || 3;
const OUT_BASENAME = process.argv[3] || "returns-data";
const start = new Date();
start.setFullYear(start.getFullYear() - YEARS_BACK);
const period1 = Math.floor(start.getTime() / 1000);
const period2 = Math.floor(Date.now() / 1000);

// equity/bond/gold/cash matches voronoi-regime.html's REGIME_SEEDS tilt
// keys; alt (VNQ, a REIT proxy) matches voronoi-robo.html's portfolio
// alloc keys (equity/bond/cash/alt -- no gold) instead
const TICKERS = { equity: "SPY", bond: "AGG", gold: "GLD", cash: "BIL", alt: "VNQ" };

async function fetchAdjClose(symbol) {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol +
    "?period1=" + period1 + "&period2=" + period2 +
    "&interval=1d&includeAdjustedClose=true";

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(symbol + " request failed: " + res.status + " " + res.statusText);
  const json = await res.json();
  const result = json.chart && json.chart.result && json.chart.result[0];
  if (!result) throw new Error(symbol + " response had no chart result: " + JSON.stringify(json).slice(0, 300));

  const timestamps = result.timestamp || [];
  const adjclose = result.indicators.adjclose[0].adjclose;
  const byDate = new Map();
  timestamps.forEach((ts, i) => {
    const price = adjclose[i];
    if (price == null) return;
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    byDate.set(date, price);
  });
  return byDate;
}

async function main() {
  console.log("Fetching " + Object.values(TICKERS).join("/") + " adjusted-close history from Yahoo Finance since " +
    new Date(period1 * 1000).toISOString().slice(0, 10) + " ...");

  const keys = Object.keys(TICKERS);
  const seriesByKey = {};
  for (const key of keys) {
    seriesByKey[key] = await fetchAdjClose(TICKERS[key]);
  }

  // inner join on trading dates present in all four series
  const dates = [...seriesByKey[keys[0]].keys()]
    .filter((d) => keys.every((k) => seriesByKey[k].has(d)))
    .sort();

  if (dates.length < 2) {
    throw new Error("Fewer than 2 overlapping trading dates across " + keys.join(", ") + " -- check the tickers/date range.");
  }

  // daily simple returns per leg, first day has no prior close so it's dropped
  const days = [];
  for (let i = 1; i < dates.length; i++) {
    const date = dates[i];
    const ret = {};
    keys.forEach((k) => {
      const prev = seriesByKey[k].get(dates[i - 1]);
      const cur = seriesByKey[k].get(date);
      ret[k] = cur / prev - 1;
    });
    days.push({ date, ret });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    tickers: TICKERS,
    source: "Yahoo Finance chart API (unofficial), adjusted close",
    days,
  };

  const outDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, OUT_BASENAME + ".json");
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const jsPath = path.join(outDir, OUT_BASENAME + ".js");
  fs.writeFileSync(jsPath, "window.RETURNS_DATA = " + JSON.stringify(payload) + ";\n");

  console.log("Wrote " + days.length + " daily returns to " + path.relative(__dirname, jsonPath) +
    " and " + path.relative(__dirname, jsPath));
  console.log("Range: " + days[0].date + " -> " + days[days.length - 1].date);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
