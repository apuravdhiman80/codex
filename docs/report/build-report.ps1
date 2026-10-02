$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "check-report-source.ps1")

if (-not (Get-Command xelatex -ErrorAction SilentlyContinue)) {
  throw "XeLaTeX was not found. Install MiKTeX or TeX Live with XeLaTeX and Biber, then reopen the terminal."
}
if (-not (Get-Command biber -ErrorAction SilentlyContinue)) {
  throw "Biber was not found. Install Biber with your TeX distribution, then reopen the terminal."
}

New-Item -ItemType Directory -Path "output/pdf" -Force | Out-Null
$job = "output/pdf/VisionID_AI_Technical_Report"
for ($pass = 1; $pass -le 3; $pass++) {
  & xelatex -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=output/pdf -jobname=VisionID_AI_Technical_Report docs/report/visionid-ai-report.tex
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  if ($pass -eq 1) {
    & biber $job
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}

Write-Host "PDF created: output/pdf/VisionID_AI_Technical_Report.pdf" -ForegroundColor Green
Write-Host "To render for review, use: pdftoppm -png -r 100 output/pdf/VisionID_AI_Technical_Report.pdf output/pdf/rendered/page"
