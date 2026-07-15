# Launches a local static server for this project (via npx serve) and opens
# the regime map in the default browser. Not strictly required -- the pages
# load data through <script src>, which works fine directly from file://.
# This is here for when you want a real localhost origin (e.g. once fetch()
# calls to live data get added, or to test from another device on the LAN).

param(
    [int]$Port = 5173,
    [string]$Page = "voronoi-regime.html"
)

$ProjectDir = $PSScriptRoot

Write-Host "Starting static server on http://localhost:$Port (serving $ProjectDir) ..."
$serverProcess = Start-Process -PassThru -WindowStyle Normal powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location `"$ProjectDir`"; npx --yes serve -l $Port ."
)

Write-Host "Waiting for the server to come up..."
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 1 | Out-Null
        $ready = $true
        break
    } catch {}
}

if (-not $ready) {
    Write-Warning "Server didn't respond within 10s -- check the server window for errors."
}

Start-Process "http://localhost:$Port/$Page"
Write-Host "Opened http://localhost:$Port/$Page -- close the server window to stop it."
