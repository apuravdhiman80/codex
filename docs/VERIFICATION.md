# Verification record

Date: 3 October 2026

## Automated checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | Passed: 33 test files, 92 tests. Includes a regression test confirming React effects are unmounted between tests. |
| `npm run test:e2e` | Passed: 5 browser flows in Microsoft Edge. The E2E adapter is test-only and labeled in the UI. |
| `npm run build` | Passed. TypeScript and Vite emitted the static `dist/` application; the production-bundle guard found no test adapter code or label. |
| Production preview and direct routes | All eight client routes loaded directly and again after refresh: `/`, `/console`, `/objects`, `/enroll`, `/people`, `/people/demo-person`, `/history`, and `/settings`. |
| LaTeX report | XeLaTeX/Biber build passed. PDF contains 31 A4 pages; all pages were rendered and visually inspected as contact sheets, with dense diagrams and the database/front-end pages checked at full resolution. |

## Real model smoke

The production preview was opened in headless Microsoft Edge with its synthetic test camera. This ran the actual bundled face/object models and the normal inference loop, not the Playwright test adapter. The browser reached `AI ENGINE READY`, reported `Camera active`, and displayed a measured inference frame (1,462 ms inference, 1,489 ms end-to-end in the recorded run). The only observed HTTP origin was the local application origin. The synthetic pattern contained no usable person or common COCO object, so zero detections were expected. These measurements are a smoke-test observation, not a performance guarantee or model-accuracy evaluation.

This check does not replace testing with a real webcam, different lighting, enrolled people, or an independent consented evaluation set. No recognition accuracy, liveness, or authentication claim is made. A live Vercel deployment was not performed; the static build, route rewrite, environment-variable boundary, and deployment instructions are prepared for deployment.

## Model-loading correction

The real-model smoke exposed that Human's configured module paths must name the JSON model files relative to `modelBasePath`. The engine now uses `blazeface.json`, `facemesh.json`, and `faceres.json`. Regression assertions cover all three paths in `tests/unit/ai/engine.test.ts`, and the production preview smoke passed after the correction.
