# VisionID AI Technical Report and PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Produce a source-controlled, technically accurate 25–50 page LaTeX report and compiled, visually inspected PDF documenting the implemented VisionID AI product.

**Architecture:** LaTeX chapter files, bibliography, and TikZ diagrams live in docs/report/. Tectonic compiles a searchable PDF to output/pdf/VisionID_AI_Technical_Report.pdf. Poppler renders every page for visual QA; scripts and README document reproducible build steps.

**Tech Stack:** LaTeX, TikZ, Tectonic (XeTeX-compatible), Poppler utilities, PowerShell build wrapper, and optional Python report QA tooling only; Python is not part of the app runtime.

**Spec:** docs/superpowers/specs/2026-10-02-visionid-technical-report-design.md

## Global Constraints

- Author implementation-specific descriptions only after app implementation is verified; code and docs/MODEL_NOTICES.md are the factual sources of truth.
- Immediately before the first PDF authoring command, run exactly once: node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pdf. Do not repeat it.
- Cite official documentation, original model/library sources, and actual versions/licenses with access dates; keep references near claims.
- Distinguish detection confidence from recognition similarity; describe 0.62 as an uncalibrated configurable setting, not an accuracy result.
- State local-only frame handling, explicit opt-in enrollment, browser-local storage limits, demo-data labels, no authentication, no liveness check, and actual limitations.
- Do not present wishlist items or future proposals as implemented features. Avoid universal accuracy, fairness, or FPS claims.

## Review Focus

- Actual shipped package/model versions, licenses, labels, browser behavior, schema, tests, commands, and Vercel setup must match code; verify during Tasks 2–5 against source and manifests.
- A report page can compile while a figure/table overflows or a glyph is missing; render and inspect all pages in Task 5.
- Bibliography, contents, labels, and cross references can remain unresolved after first compile; Task 1/5 repeat required build passes and inspect extracted text.
- PDF can be stale while build reports success; Task 5 starts from clean intermediates and verifies output time/hash/page count.
- Technical examples can accidentally imply biometric export or authentication; Tasks 2–3 include claim and privacy checks against the implemented code.

---

### Task 1: Set up report tooling and LaTeX skeleton

**Dependency:** Complete and verify browser app Tasks 1–10 before writing implementation claims. The title/preamble skeleton may be authored earlier, but wait to fill product behavior.

**Files:** Create docs/report/main.tex, docs/report/preamble.tex, docs/report/references.bib, docs/report/chapters/00-abstract.tex, docs/report/chapters/01-introduction.tex, docs/report/chapters/02-problem-statement.tex, docs/report/chapters/03-objectives.tex, docs/report/chapters/04-system-overview.tex, docs/report/chapters/05-technologies.tex, docs/report/chapters/06-computer-vision.tex, docs/report/chapters/07-face-recognition-pipeline.tex, docs/report/chapters/08-object-detection-pipeline.tex, docs/report/chapters/09-qr-architecture.tex, docs/report/chapters/10-database-design.tex, docs/report/chapters/11-frontend-architecture.tex, docs/report/chapters/12-ai-architecture.tex, docs/report/chapters/13-real-time-processing.tex, docs/report/chapters/14-recognition-logic.tex, docs/report/chapters/15-privacy-security.tex, docs/report/chapters/16-error-handling.tex, docs/report/chapters/17-testing.tex, docs/report/chapters/18-deployment.tex, docs/report/chapters/19-troubleshooting.tex, docs/report/chapters/20-future-work.tex, scripts/check-report-source.ps1, scripts/build-report.ps1, and .gitignore report-output entries.

**Interfaces:** main.tex inputs preamble, title/abstract, 20 numbered chapter files, glossary/appendix, and bibliography. scripts/build-report.ps1 checks required tools, clears stale intermediates, compiles to output/pdf/VisionID_AI_Technical_Report.pdf, and returns nonzero on missing tool or failed compilation.

- [ ] Step 1: Confirm whether the required artifact marker utility is present and note Tectonic/Poppler availability. If the marker is not at the documented path, locate its supported installation before proceeding.
- [ ] Step 2: Immediately before authoring the first LaTeX source or invoking its compiler, run exactly once: node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pdf. Do not repeat it.
- [ ] Step 3: Add a report QA check that asserts title, abstract, chapter labels 1–20, and bibliography exist in source. Run it before filling chapters. Expected: FAIL on missing source structure.
- [ ] Step 4: Build the document skeleton and restrained navy/teal style with Unicode-capable font configuration, margins, running headers/footers, page numbers, captions, hyperlinks, bibliography, TikZ, code listings, and consistent list/table spacing.
- [ ] Step 5: Run pwsh -NoProfile -File scripts/check-report-source.ps1. Expected: PASS for title, abstract, chapter labels 1–20, and bibliography.
- [ ] Step 6: Add a PowerShell build script that checks Tectonic/Poppler, performs a clean compile, and emits precise install/build guidance when a tool is missing.
- [ ] Step 7: Run pwsh -NoProfile -File scripts/build-report.ps1. Expected: successful searchable skeleton PDF with contents, page numbering, title, and no unresolved references.
- [ ] Step 8: Commit Task 1 files with message docs: scaffold VisionID report.

### Task 2: Document product, architecture, data, and computer vision

**Files:** Modify docs/report/chapters/01-introduction.tex, docs/report/chapters/02-problem-statement.tex, docs/report/chapters/03-objectives.tex, docs/report/chapters/04-system-overview.tex, docs/report/chapters/05-technologies.tex; create docs/report/figures/architecture.tex; update docs/report/references.bib.

**Interfaces:** Each chapter defines a stable LaTeX label consumed by later references. Figures use standalone TikZ input files and expose a caption/label at inclusion. Citations use stable bib keys and include source title, publisher, URL/DOI, and access date.

- [ ] Step 1: Create a source-fact inventory from package lock, source files, schema/migrations, model manifest/notices, tests, and Vercel config. Mark each implementation claim with its source path or primary reference; unresolved claims are removed or described as future work.
- [ ] Step 2: Write Chapter 1, introducing the shipped system and distinguishing person detection, face detection, face recognition, object detection, and real-time inference.
- [ ] Step 3: Write Chapter 2 problem statement and Chapter 3 objectives/success criteria using the approved product boundary.
- [ ] Step 4: Write Chapter 4 system overview and its end-to-end architecture figure, including browser, camera, AI, local database, and static hosting boundaries.
- [ ] Step 5: Write Chapter 5 technologies with the exact packages, model assets, versions, browser APIs, tests, and deployment tools from the lockfile and notices.
- [ ] Step 6: Run pwsh -NoProfile -File scripts/build-report.ps1. Expected: Chapters 1–5 compile, citations resolve, diagrams have captions/labels, and no unresolved references.
- [ ] Step 7: Commit Task 2 files with message docs: explain VisionID product and architecture.

### Task 3: Document data model and computer-vision pipelines

**Files:** Modify docs/report/chapters/06-computer-vision.tex, docs/report/chapters/07-face-recognition-pipeline.tex, docs/report/chapters/08-object-detection-pipeline.tex, docs/report/chapters/09-qr-architecture.tex, and docs/report/chapters/10-database-design.tex; create docs/report/figures/qr-flow.tex, docs/report/figures/enrollment.tex, docs/report/figures/recognition.tex, docs/report/figures/object-detection.tex, and docs/report/figures/entity-relationship.tex; update docs/report/main.tex and docs/report/references.bib.

**Interfaces:** Chapters expose stable labels; diagram files are included from the owning chapter with captions and labels. Database names and fields match the Dexie schema exactly.

- [ ] Step 1: Write Chapter 6 on image/frame/pixel/RGB, bounding boxes, class/confidence, detection, tracking, landmarks, and embeddings.
- [ ] Step 2: Write Chapter 7 with the actual face pipeline, descriptor model, comparison method, threshold, and limitations.
- [ ] Step 3: Write Chapter 8 with the selected object model, actual outputs, confidence filtering, postprocessing, and supported classes. Do not infer an NMS stage unless the selected model actually uses one.
- [ ] Step 4: Write Chapter 9 for versioned QR generation/scanning/validation/profile creation and the enrollment sequence diagram.
- [ ] Step 5: Write Chapter 10 for actual Dexie tables, fields, transactions, retention, and ER diagram. Use fictional examples and omit descriptor contents.
- [ ] Step 6: Run pwsh -NoProfile -File scripts/build-report.ps1. Expected: Chapters 6–10 compile, citations resolve, figures have captions/labels, and no unresolved references.
- [ ] Step 7: Commit Task 3 files with message docs: explain VisionID data and computer vision.

### Task 4: Document frontend, AI runtime, metrics, privacy, errors, and validation

**Files:** Modify docs/report/chapters/11-frontend-architecture.tex, docs/report/chapters/12-ai-architecture.tex, docs/report/chapters/13-real-time-processing.tex, docs/report/chapters/14-recognition-logic.tex, docs/report/chapters/15-privacy-security.tex, docs/report/chapters/16-error-handling.tex, docs/report/chapters/17-testing.tex, and docs/report/references.bib.

**Interfaces:** Chapter labels and bibliography keys remain unique; metric tables identify measured values as examples from an actual local run only or omit them when no measurement was captured.

- [ ] Step 1: Write Chapter 11 for the actual React routes and component responsibilities, then Chapter 12 for model loading and same-origin assets.
- [ ] Step 2: Write Chapter 13 for frame cadence, workers/fallback, and actual measured FPS/latency; write Chapter 14 for exact per-face matching, Unknown, and ambiguous decisions.
- [ ] Step 3: Write Chapters 15–16 for camera permission, local biometrics/data minimization/deletion/export, no authentication/liveness, and implemented error recovery.
- [ ] Step 4: Write Chapter 17 for actual unit/repository/feature/UI/E2E tests, deterministic test adapters, and manual real-device smoke coverage.
- [ ] Step 5: Add a score/configuration table that separates detector confidence from recognition similarity and states the threshold is uncalibrated. Add model/version/license/label and feature-to-test tables from shipped source.
- [ ] Step 6: Run a claim audit: search all chapters for FPS, accuracy, secure/authenticate, real-time, model name/version, cloud, upload, and demo; verify each occurrence against source and revise unsupported claims.
- [ ] Step 7: Run pwsh -NoProfile -File scripts/build-report.ps1. Expected: all new chapters, tables, citations, labels, and references compile cleanly.
- [ ] Step 8: Commit Task 4 files with message docs: explain VisionID runtime privacy and testing.

### Task 5: Document deployment, troubleshooting, limitations, and future work

**Files:** Modify docs/report/chapters/18-deployment.tex, docs/report/chapters/19-troubleshooting.tex, docs/report/chapters/20-future-work.tex; create docs/report/figures/deployment.tex and docs/report/figures/data-flow.tex; update docs/report/references.bib.

**Interfaces:** Deployment steps use exact scripts and commands from README/package.json/vercel.json. Troubleshooting entries use the same error messages and control names as the UI.

- [ ] Step 1: Write Chapter 18 with actual static Vercel deployment/build/rewrite flow and a diagram showing camera frames/profile data stay in the browser while static assets are delivered by Vercel.
- [ ] Step 2: Write Chapter 19 covering camera denial/no device/removal, unsupported backend/model load, offline/cache, low performance, Unknown/incorrect match, QR validation, quota/database, and direct-route refresh with exact available recovery steps.
- [ ] Step 3: Write Chapter 20 with explicitly future improvements only. Add a limitations table covering lighting, distance, pose, occlusion, supported detector classes, hardware/browser performance, uncalibrated threshold, local data loss, and non-authentication.
- [ ] Step 4: Compile with pwsh -NoProfile -File scripts/build-report.ps1. Expected: all 20 chapters and diagrams compile; no future proposal is described as current functionality.
- [ ] Step 5: Commit Task 5 files with message docs: document VisionID deployment limits and roadmap.

### Task 6: Build, render, inspect, and publish the PDF artifact

**Files:** Create output/pdf/VisionID_AI_Technical_Report.pdf and output/pdf/rendered/page-*.png; modify scripts/build-report.ps1, README.md, and only the report source files that fail final QA.

**Interfaces:** Final build writes only the named PDF plus ignored intermediate/render artifacts. README links the PDF and source folder and names exact tool requirements and build command.

- [ ] Step 1: Remove stale report intermediates/output, then run pwsh -NoProfile -File scripts/build-report.ps1. Expected: fresh PDF with nonzero size and current build timestamp.
- [ ] Step 2: Run pdfinfo output/pdf/VisionID_AI_Technical_Report.pdf and pdftotext output/pdf/VisionID_AI_Technical_Report.pdf output/pdf/report-check.txt. Verify 25–50 pages, searchable text, title, all 20 chapter headings, contents, captions, references, page numbers, and no unresolved citation text.
- [ ] Step 3: Render every page with pdftoppm -png -r 120 output/pdf/VisionID_AI_Technical_Report.pdf output/pdf/rendered/page. Inspect the complete contact sheet and full-resolution title, contents, all dense tables/diagrams, and any page flagged by overflow checks. Fix and rerender all clipping, overlaps, missing glyphs, accidental blank pages, or unreadable graphics.
- [ ] Step 4: Add README report links/build steps and report toolchain requirements. Re-run the clean build and repeat page/text/visual checks. Expected: current deliverable matches source and has no known layout defect.
- [ ] Step 5: Commit report sources, build script, README link, and requested PDF artifact with message docs: add VisionID technical report.
