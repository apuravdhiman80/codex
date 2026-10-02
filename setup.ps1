$ErrorActionPreference = "Stop"

Write-Host "VisionID AI setup" -ForegroundColor Cyan
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
  throw "Node.js 22.12+ and npm are required. Install Node.js from https://nodejs.org/ and reopen PowerShell."
}

$nodeVersionText = (& node --version).TrimStart("v")
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion -lt [version]"22.12.0") {
  throw "Found Node.js $nodeVersionText. VisionID AI requires Node.js 22.12 or later."
}

Write-Host "Using Node.js $nodeVersionText. Installing locked npm dependencies..."
& npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Checking the production build..."
& npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Setup complete. Start the app with: npm run dev" -ForegroundColor Green
Write-Host "Then open http://localhost:5173. Browser E2E tests need: npx playwright install chromium"
