// Sanity-checks the inline <script>...</script> block in each of this
// repo's self-contained HTML pages, without a build step: extract the last
// <script> block (same one the page actually runs) and syntax-check it with
// vm.Script, which uses the same V8 parser `node --check` does. Run with:
//   node scripts/check-inline-scripts.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const FILES = ["voronoi-robo.html", "voronoi-regime.html"];

let failed = false;

FILES.forEach((file) => {
  const filePath = path.join(__dirname, "..", file);
  const html = fs.readFileSync(filePath, "utf8");
  const start = html.lastIndexOf("<script>");
  const end = html.lastIndexOf("</script>");

  if (start === -1 || end === -1 || end <= start) {
    console.error(file + ": couldn't find an inline <script>...</script> block");
    failed = true;
    return;
  }

  const code = html.slice(start + "<script>".length, end);
  try {
    new vm.Script(code, { filename: file + " (inline script)" });
    console.log(file + ": OK");
  } catch (err) {
    console.error(file + ": " + err.message);
    failed = true;
  }
});

process.exit(failed ? 1 : 0);
