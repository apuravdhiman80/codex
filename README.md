# VisionID AI

**Intelligent Person Recognition and Real-Time Object Detection Web Platform**

VisionID is a local-first browser computer-vision demo. It combines permission-gated camera access, face detection, optional face enrollment and conservative matching, QR-assisted profile entry, COCO object detection, a local event history, and privacy controls. Camera frames and profile data stay in the browser. There is no account, cloud directory, backend, or frame upload.

> **Use and model notice:** Face identification runs only against profiles that were explicitly enrolled on this browser. It is not authentication, access control, liveness detection, or a perfect-accuracy system. The included FaceRes weights were trained using VGGFace2, whose dataset terms restrict use to non-commercial research. Review [model and data notices](docs/MODEL_NOTICES.md) before redistributing or using the weights commercially.

## Features

- Real browser-side face detection, landmarks, and embeddings through Human 3.3.6.
- Face enrollment requires a profile preview, explicit consent, and 3-5 quality-approved live samples. Demo people have no descriptors.
- Conservative per-face recognition. Similarity below the selected threshold or too close to another profile remains Unknown.
- COCO-SSD Lite object detection with bounding boxes, class, detector score, temporary tracking IDs, and detail cards.
- Vision Fusion and object-only modes with measured FPS and latency.
- QR scanning and generation plus a validated JSON paste fallback and manual profile form.
- IndexedDB directory, filtered event history, demo-labelled sample history, redacted JSON/CSV exports, and session report.
- Settings for model threshold, matching threshold/margin, resolution/cadence, camera, overlays, theme, quality gates, and event retention.
- Local demo reset, model cache clearing, and confirmation-gated deletion of all local records.
- Responsive, keyboard-accessible interface with recovery messages and reduced-motion support.

## Screenshots

The application includes an illustrative landing preview that is clearly labeled static; it does not show fabricated detections. For a real camera view, start the Vision Console and observe live model output.

## Architecture

```text
React + TypeScript SPA
  |-- Camera and QR browser APIs
  |-- Worker inference: Human face modules + COCO-SSD Lite
  |-- Matching, quality checks, tracking, and event aggregation
  `-- Dexie / IndexedDB: profiles, descriptors, events, settings
        `-- Vercel static hosting: app + same-origin model/WASM assets
```

There is no Python runtime or API server. See [the architecture guide](docs/ARCHITECTURE.md) for route map, data model, processing sequence, and deployment boundary.

## Tech stack

| Component | Selection |
| --- | --- |
| Frontend | React 19.3, TypeScript 6, Vite 8, React Router 7, Tailwind CSS 4 |
| Local storage | Dexie 4 / browser IndexedDB |
| Face pipeline | `@vladmandic/human` 3.3.6 (BlazeFace, FaceMesh, HSE FaceRes descriptor) |
| Object pipeline | `@tensorflow-models/coco-ssd` 2.2.3, Lite MobileNet v2, 80 COCO categories |
| Runtime | TensorFlow.js 4.22.0 with WebGL, WASM, CPU fallback |
| QR | ZXing Browser 0.2.1 and QRCode 1.5.4 |
| Quality gates | ESLint 10, TypeScript, Vitest 5, Testing Library, Playwright 1.63 |
| Hosting | Vercel static output from `dist/` |

The app supports the model's trained COCO classes; it does not identify arbitrary objects. Face detection confidence, object detector confidence, and recognition similarity are different measurements and are shown separately.

## Requirements

- Windows, macOS, or Linux.
- Node.js 22.12.0 or newer and npm (the Node.js installer includes npm).
- A current Chrome or Edge browser is recommended for the camera/AI console. The app gives a compatibility or model error when a browser feature is unavailable.
- A webcam for live inference. Browser camera APIs work on `http://localhost` and HTTPS.
- Approximately 29 MB of same-origin model/WASM downloads the first time the models initialize; the browser cache can retain them.

No Python install, database service, cloud account, environment secret, or API key is required.

## Installation

From the project folder:

```powershell
npm ci
```

On Windows, `setup.bat` or `setup.ps1` checks Node and npm, installs the locked packages, and builds the app:

```powershell
.\setup.ps1
```

or double-click `setup.bat`. Browser-based E2E tests also need Playwright's Chromium binary, installed once with `npx playwright install chromium`.

## Running locally

```powershell
npm run dev
```

Open the printed local URL (normally <http://localhost:5173>). Camera access starts only after pressing a camera action. When prompted, allow camera access for localhost.

Production output and local preview:

```powershell
npm run build
npm run preview
```

## Demo mode

1. Open the home page.
2. Select **Load demo workspace**.
3. Open Detection History or the analytics panel to see fictional entries marked **DEMO DATA**.
4. The sample profiles have no face templates and cannot be matched to a camera face.

Demo history is illustrative stored history, not live model output. Reset Demo Data replaces demo records only and preserves enrolled people.

## QR enrollment and face enrollment

1. Open **Enroll Person**. Use the manual form, scan a QR with the camera, or open **Enter QR data manually** to paste a QR payload.
2. Confirm the parsed profile fields in the preview. A valid v1 QR JSON has `version: 1`, `person_id`, and `name`; it cannot contain a photo or biometric template. Payload limit: 8 KiB UTF-8.
3. Select the local face enrollment consent checkbox. Without consent, **Save profile and continue** remains disabled.
4. Save the profile; then start the camera and capture the guided prompts. Samples must meet configured single-face, size, brightness, sharpness, and pose checks.
5. Only accepted face descriptors are stored. Camera frames are discarded. Finish with the configured minimum number of approved samples (3 by default).

QR profile entry alone does not enroll a face. Enrollment requires an explicit separate consent and real model output; no sample image or descriptor is synthesized.

## Object detection and Vision Fusion

Open **Object Detection** for COCO object labels only, or **Vision Console** for face analysis and object detection together. Press **Start vision** and allow the browser camera. The model download happens from this app's origin; wait while the face and object models initialize. Hold a supported object such as a bottle in view to see the actual detector result, box, score, and temporary tracking ID. Stop the session to release the camera.

Object detector confidence is the detector's score. Recognition similarity comes from comparing an enrolled face embedding with local templates. They are never substituted for one another. Hardware, light, camera resolution, browser support, distance, and pose affect live output and speed.

## Environment variables

Local and Vercel production mode require **no environment variables**. `.env.example` documents that the app has no secrets or service URLs. Never put an API key in a `VITE_*` variable because Vite embeds those values in public browser code. Playwright sets `VITE_E2E_TEST_ADAPTERS=true` only for its dedicated `--mode e2e` server; do not publish or use that mode for real inference.

## Testing and code quality

```powershell
npm test
npm run lint
npm run typecheck
npm run test:e2e
```

Playwright first-time browser setup:

```powershell
npx playwright install chromium
npm run test:e2e
```

Unit/integration/UI tests cover settings validation, IndexedDB lifecycle, QR parsing, descriptor matching, quality gates, event exports, accessibility, error states, and feature behavior. E2E tests use a deterministic test-only camera/model adapter, explicitly labeled in the UI. Those fixtures test wiring and recovery; they are not real detections or accuracy evidence. For headless Edge already installed on a Windows machine, optionally set `$env:PW_EXECUTABLE_PATH` to the Edge executable before `npm run test:e2e`.

See [the verification record](docs/VERIFICATION.md) for the latest test counts and the production preview smoke using the actual model pipeline with a synthetic camera stream.

## Build

```powershell
npm run build
npm run preview
```

The build runs the TypeScript project build and emits static files into `dist/`. Model assets remain in `public/models/v1/` and are copied to the static output.
## Technical report PDF

The compiled report is included at [`output/pdf/VisionID_AI_Technical_Report.pdf`](output/pdf/VisionID_AI_Technical_Report.pdf). It covers the system architecture, browser-side face and object pipelines, QR flow, local data model, deployment, privacy, testing, limitations, and troubleshooting. Editable LaTeX source and references are in `docs/report/`.

To rebuild the PDF on Windows, install MiKTeX or TeX Live with XeLaTeX, Biber, TikZ, and the packages used by the report, then run:

```powershell
.\docs\report\build-report.ps1
```

The PDF is already supplied, so LaTeX is needed only when editing or rebuilding the report.

## Vercel deployment

1. Push this repository to GitHub or another Git provider.
2. Import the repository in Vercel (or use the Vercel CLI).
3. Use the repository root as the project root and Vite as the framework preset.
4. Build command: `npm run build`. Output directory: `dist`. Install command: `npm ci`.
5. Do not add environment variables; none are required.
6. Deploy. Confirm HTTPS, then open `/`, `/console`, `/enroll`, `/history`, and `/settings`; refresh a non-root route to verify the SPA rewrite.

CLI alternative:

```powershell
npx vercel login
npx vercel
npx vercel --prod
```

Vercel serves the browser app and public model files. It does not receive camera frames, profiles, descriptors, or event history. The framework's Vite guide describes static output and the SPA rewrite requirement: <https://vercel.com/docs/frameworks/frontend/vite>.

## Privacy and security

- Camera access is opt-in by a user action. The app shows when a camera session is active.
- Frames stay in browser memory and are not stored, logged, or sent to a third party.
- Person profiles and explicitly enrolled face descriptors stay in this browser's IndexedDB. Other browser profiles/devices do not share the data.
- QR data is validated and previewed before save. Raw QR text is not saved in event records.
- Default exports omit face descriptors and portraits. Clear all local data stops active inference first.
- The system does not infer or display sensitive attributes such as age, gender, race, emotion, health, or personality.
- This demo is not an authentication mechanism, liveness test, or access-control system.

See [model provenance, asset hashes, and training-data limitations](docs/MODEL_NOTICES.md).

## Project structure

```text
src/app/                    shell, routes, error boundary
src/pages/                  landing and not-found screens
src/components/             dialogs, shared states, toasts
src/ai/                     engine, worker, matching, tracking, fusion
src/features/               camera, console, QR, enrollment, people, history, settings
src/data/                   Dexie schema, repositories, demo seed
src/types/                  typed domain contracts
public/models/v1/           versioned browser model and WASM assets
tests/unit/                  pure logic and data tests
tests/integration/           repository and feature tests
tests/ui/                    React behavior and accessibility tests
tests/e2e/                   browser flows; test adapters only
docs/                        architecture, model notices, LaTeX report source
output/pdf/                  compiled technical report
```

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Camera does not start | Use `http://localhost` or HTTPS. In browser site settings allow camera, select a device in Settings, close other camera apps, then retry. |
| No camera is listed | Reconnect it, check OS camera privacy settings, reload, and try another supported browser. |
| Model initialization fails | Confirm network access to this app's origin on first load, refresh, retry; browser extensions/firewalls may block `.bin`/`.wasm`. Settings can clear only the model cache. |
| Face remains Unknown | Only opt-in enrolled profiles can match. Improve light, face size, and frontal pose; add quality-approved samples; lower the recognition threshold carefully. Do not treat a weak match as identity proof. |
| Low FPS | Select the Performance preset, close GPU-heavy tabs, use a current desktop browser, and reduce webcam resolution. Values shown are measured locally, not promised. |
| QR fails | Check valid JSON, `version: 1`, required `person_id` and `name`, supported optional fields, no unknown root fields, and the 8 KiB limit. Keep the QR in focus or paste its text in the manual QR field. |
| Profiles/history are missing | Data is local to the current browser profile and device. Check that browser storage was not cleared and the browser is not in private mode. |
| Direct URL gives a not-found/blank response | On Vercel, confirm the included `vercel.json` SPA rewrite is deployed. Locally, use the Vite dev or preview server rather than opening `index.html` as a file. |
| Build says Node is too old | Install Node.js 22.12+ and reopen the terminal before rerunning `npm ci`. |

## Limitations and future work

Lighting, face pose/occlusion, camera quality, device performance, browser backend support, and uncalibrated thresholds affect results. The face matcher operates only on voluntarily enrolled records. FaceRes weights have VGGFace2 non-commercial research terms; a commercial deployment must replace the model or obtain rights guidance. No face-recognition accuracy claim is made.

Possible future work includes an embedding model with clearly transferable training-data rights, encrypted user-controlled backup, additional on-device model variants, more explicit model evaluation on consented data, multi-camera sessions, and improved accessibility research. Cloud sync and account features are not implemented.

## License

The source code in this repository is MIT licensed. Third-party packages and model assets have separate licenses and provenance; see [LICENSE](LICENSE) and [MODEL_NOTICES.md](docs/MODEL_NOTICES.md).
