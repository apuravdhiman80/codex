# VisionID AI Technical Report Design

**Date:** 2026-10-02  
**Status:** User approved; implementation plan drafted for review.
**Dependency:** The report is written after the browser app design in `2026-10-02-visionid-browser-app-design.md` has been implemented and verified, so the report describes delivered behavior.

## Goal

Produce a polished, technically accurate LaTeX report and compiled PDF titled **VisionID AI: Intelligent Person Recognition and Real-Time Object Detection Web Platform**. Target 25–35 content-rich pages, within the requested 25–50 range, with no filler.

## Source and output

- LaTeX source, bibliography, TikZ diagrams, and any report assets live under `docs/report/`.
- Final output is `output/pdf/VisionID_AI_Technical_Report.pdf`.
- Build with Tectonic/XeTeX-compatible LaTeX using reproducible font and package choices. A Windows script checks for Tectonic and provides an exact install/build command when absent.
- Before the first PDF authoring command, run the PDF skill's required `mark_artifact_operation_started.mjs` command exactly once. Render the completed PDF to page PNGs with Poppler, inspect representative pages and all detected layout issues, revise, and re-render before delivery.

## Document styling

Use a restrained technical-paper design: Libertinus (or a bundled-safe serif/sans pairing), dark navy headings with a teal accent, consistent margins, running headers, footer/page numbers, well-spaced tables, figure captions, and boxed code examples. Build diagrams with TikZ so they are crisp, source-controlled, and compile without an external diagram service. Use real sectioning, references, and bibliography entries; avoid placeholder text and broken glyphs.

## Required chapter map

1. Introduction: system overview; distinguish person detection, face detection, face recognition, object detection, and real-time inference.
2. Problem statement.
3. Objectives and success criteria.
4. System overview and end-to-end flow.
5. Technologies used: React, TypeScript, Vite, browser APIs, Human/TFJS, QR, IndexedDB/Dexie, tests, and Vercel.
6. Computer-vision fundamentals: image/frame/pixel/RGB, bounding boxes, classification, confidence, detection, tracking, landmarks, embeddings.
7. Face recognition pipeline: capture → face box → alignment/preprocessing → descriptor → matching → threshold → recognized/unknown, including limitations.
8. Object detection pipeline: frame → preprocessing → model → candidate boxes/classes → confidence filtering/NMS → output (describe only the selected model's actual implementation).
9. QR architecture: generation/scanning, versioned JSON, validation, preview, profile association, and error states.
10. Local database design: profile, template, settings, and event schemas with an ER diagram.
11. Frontend architecture and route/component responsibilities.
12. AI architecture: model loading, browser inference, postprocessing, settings, and local asset delivery.
13. Real-time processing: measured FPS, latency, throttling, resolution, worker/fallback behavior.
14. Recognition logic: per-face/per-template comparison, configurable threshold and ambiguous-match handling.
15. Privacy/security: camera permissions, opt-in enrollment, local-only frame processing, storage/deletion, QR validation, data minimization.
16. Error handling.
17. Testing: unit, repository integration, feature/UI, browser simulations, and real-device checklist.
18. Deployment: source repository → Vercel build → static hosting → secure-context camera access.
19. Troubleshooting: camera denied/no camera, model load, low FPS, unknown/incorrect match, QR scan, local storage/quota, direct route refresh.
20. Future improvements, each clearly distinguished from current functionality.

## Required diagrams and tables

- Overall browser architecture with UI, camera, AI worker/runtime, local persistence, and Vercel asset delivery.
- QR registration/enrollment sequence.
- Face enrollment and recognition pipeline.
- Object detection and tracker flow.
- IndexedDB entity relationship diagram.
- Vercel deployment/data-flow diagram showing that camera frames and profile data stay on device.
- Model/configuration table distinguishing detector confidence from recognition similarity.
- Testing matrix and limitations table.

## Accuracy and citation rules

- Cite official documentation and original model/library sources with readable bibliography entries and access dates.
- State actual package/model versions, labels, model sources, and license notices after implementation pins are finalized.
- No claim that a browser hit rate, 28 FPS, or recognition accuracy is guaranteed. Distinguish measured local values from external benchmark values and explain dataset/protocol when quoting a benchmark.
- Explain that seeded history is demo data, profiles are fictitious, and live detections require actual model inference.
- Do not describe unbuilt cloud sync, Python service, authentication, liveness detection, demographics, or unsupported model functionality as part of v1.
- Make the no-authentication limitation prominent in the privacy/security and limitations chapters.

## Acceptance criteria

- LaTeX sources compile to a searchable PDF with working contents, references, captions, headers, footers, and page numbers.
- Report length is 25–50 pages with meaningful content in each required chapter.
- All required diagrams are legible and captioned.
- No placeholder/TODO content or unsupported functionality claims.
- Latest rendered page images show no clipped text, overfull tables, overlapping elements, missing glyphs, blank accidental pages, or unreadable figures.
- README links to the PDF source and exact build command.

