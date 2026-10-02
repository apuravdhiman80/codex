$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "visionid-ai-report.tex"
$source = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)

$required = @(
  "VisionID AI",
  "\chapter*{Executive Summary}",
  "\printbibliography",
  "\begin{document}",
  "\end{document}"
)
$chapterTitles = @(
  "Introduction",
  "Problem Statement",
  "Objectives and Success Criteria",
  "System Overview",
  "Technologies Used",
  "Computer Vision Fundamentals",
  "Face Recognition Pipeline",
  "Object Detection Pipeline",
  "QR Architecture",
  "Database Design",
  "Frontend Architecture",
  "AI Architecture",
  "Real-Time Processing",
  "Recognition Logic",
  "Privacy and Security",
  "Error Handling",
  "Testing",
  "Deployment",
  "Troubleshooting and Limitations",
  "Future Improvements"
)

$missing = @($required | Where-Object { -not $source.Contains($_) })
$missing += @($chapterTitles | Where-Object { -not $source.Contains("\chapter{$_}") })
if ($missing.Count -gt 0) {
  throw "Report source is missing required elements: $($missing -join ', ')"
}

Write-Host "Report source check passed: title, executive summary, 20 chapters, and bibliography." -ForegroundColor Green
