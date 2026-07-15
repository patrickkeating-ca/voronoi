// Pulls real VIX and 10Y-2Y curve data from FRED and writes a static JSON
// file the HTML page can fetch. Run with:
//   node --env-file=.env fetch-data.js
// (requires Node 20.6+ for --env-file; this repo has been tested on v22)

const API_KEY = process.env.FRED_API_KEY;
if (!API_KEY) {
  console.error("Missing FRED_API_KEY. Put it in .env (see .env.example) and run:");
  console.error("  node --env-file=.env fetch-data.js");
  process.exit(1);
}

const fs = require("fs");
const path = require("path");

const YEARS_BACK = 3;
const start = new Date();
start.setFullYear(start.getFullYear() - YEARS_BACK);
const observationStart = start.toISOString().slice(0, 10);

const SERIES = { slope: "T10Y2Y", vix: "VIXCLS" };

async function fetchSeries(seriesId) {
  const url =
    "https://api.stlouisfed.org/fred/series/observations" +
    "?series_id=" + seriesId +
    "&api_key=" + API_KEY +
    "&file_type=json" +
    "&observation_start=" + observationStart;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(seriesId + " request failed: " + res.status + " " + res.statusText);
  }
  const json = await res.json();
  if (!json.observations) {
    throw new Error(seriesId + " response had no observations: " + JSON.stringify(json).slice(0, 300));
  }

  // FRED marks missing values with "."
  const byDate = new Map();
  json.observations.forEach((obs) => {
    if (obs.value !== ".") byDate.set(obs.date, parseFloat(obs.value));
  });
  return byDate;
}

async function main() {
  console.log("Fetching " + SERIES.slope + " and " + SERIES.vix + " from FRED since " + observationStart + " ...");
  const [slopeByDate, vixByDate] = await Promise.all([
    fetchSeries(SERIES.slope),
    fetchSeries(SERIES.vix),
  ]);

  // inner join on trading dates present in both series
  const dates = [...slopeByDate.keys()].filter((d) => vixByDate.has(d)).sort();
  const days = dates.map((date) => ({
    date,
    vix: vixByDate.get(date),
    slope: slopeByDate.get(date),
  }));

  if (days.length === 0) {
    throw new Error("No overlapping observations between the two series — check the API key and series IDs.");
  }

  const payload = { generatedAt: new Date().toISOString(), days };

  const outDir = path.join(__dirname, "data");
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "regime-data.json");
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  // Also emit a plain <script>-includable version. Opening the HTML directly
  // as a file:// URL blocks fetch() of local JSON via CORS in most browsers;
  // a global assigned by a <script src> tag has no such restriction.
  const jsPath = path.join(outDir, "regime-data.js");
  fs.writeFileSync(jsPath, "window.REGIME_DATA = " + JSON.stringify(payload) + ";\n");

  console.log("Wrote " + days.length + " daily observations to " + path.relative(__dirname, jsonPath) + " and regime-data.js");
  console.log("Range: " + days[0].date + " -> " + days[days.length - 1].date);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
