# VisionID AI Browser Application Design

**Date:** 2026-10-02  
**Status:** User approved; implementation plan drafted for review.
**Scope:** Local-first VisionID AI browser application and its deployment, setup, README, architecture documentation, and automated tests.

## Product intent

Build a polished browser application for an opt-in, single-device demonstration of real-time object detection and identification of voluntarily enrolled people. Camera frames and all person records remain on the device. The app is a demonstration and analytics tool, not an authentication system or a production access-control decision-maker.

Success means a first-time user can start the app, understand the privacy boundary, activate a camera, scan or enter profile data, enroll their own face, see real object and face detections, distinguish unknown people from matches, browse events, export non-biometric records, clear data, and deploy the static app to Vercel. The app must not fabricate model activity or identity matches.

## Scope decomposition

This is one coherent client-side product with several independently reviewable areas:

1. **Browser application:** camera, inference, QR, enrollment, person directory, history, settings, local persistence, accessibility, and responsive layout.
2. **Project delivery:** Vercel configuration, setup scripts, automated tests, README, and architecture documentation.
3. **Technical report:** specified separately in `2026-10-02-visionid-technical-report-design.md`; it depends on the final implementation and is authored after the app stabilizes.

There is no cloud directory, user account, API server, Python inference service, or cross-device sync in v1. These would conflict with the chosen local, single-device data model and add infrastructure the current goal does not require.

## Architecture

The application is a React, TypeScript, Vite single-page application. It uses React Router for routes, Tailwind CSS for styling, Dexie 4 over IndexedDB for local records, ZXing Browser for QR scanning/generation, and `@vladmandic/human` behind a replaceable AI adapter. Vercel serves compiled static assets and same-origin model files; it does not receive camera frames or person records.

```text
Browser UI
  ├── Routes and product features
  ├── Camera service ── MediaDevices API ── video stream
  ├── QR feature ── ZXing Browser
  ├── Vision adapter ── Human / TensorFlow.js browser runtime
  │     ├── Face detection, landmarks, descriptor
  │     └── COCO object detections
  ├── Fusion + track association + event rules
  └── Repositories ── Dexie / IndexedDB
                         ├── profiles
                         ├── embeddings
                         ├── events
                         └── settings
```

### Frontend boundaries

- **App shell and router:** global navigation, route fallback, page titles, error boundary, theme, and toasts.
- **Vision console:** video surface, separate canvas overlay, camera controls, Fusion/Object mode, status badges, metrics, and details panel. Video drawing and React rendering are separate from inference cadence.
- **Enrollment feature:** QR/manual profile creation, profile preview, face-quality guidance, guided multi-sample capture, duplicate warning, progress, and completion/error states.
- **People feature:** searchable/filterable directory, profile details, edit, delete, re-enrollment, recognition statistics, and detection history.
- **History feature:** filtered events, detail view, clear, CSV export, JSON export, and report summary.
- **Settings feature:** thresholds, camera, inference profile, overlays, theme, privacy, model/cache status, demo reset, and local-data deletion.
- **Data layer:** typed repositories that isolate IndexedDB from React components; database schema migrations are versioned.
- **AI layer:** typed engine contract converts model-specific outputs into application types; matching, quality scoring, tracking, and event aggregation remain replaceable functions.

### Routes

- `/` — landing and guided actions
- `/console` — Vision Fusion console
- `/objects` — dedicated object-detection console using the same camera/inference surface
- `/enroll` — QR scan, manual registration, and face enrollment
- `/people` — directory
- `/people/:personId` — profile and recognition history
- `/history` — detection event history
- `/settings` — thresholds, camera, display, model, privacy, and data controls
- unknown paths — accessible not-found page

## AI runtime and model behavior

The Human browser library provides face boxes, landmarks, embeddings, similarity matching, webcam/video inputs, and an object detector. Only the required face and object modules are enabled. Age, gender, emotion, race, personality, health, and other attribute inference are never enabled. For face descriptions, the app consumes only the face descriptor and ignores any unrelated outputs present in a model graph.

Before model assets are added to the app, record the exact package/model version, upstream source, license, attribution, model class list, and file checksum in `docs/MODEL_NOTICES.md`. The package and model repository report MIT licensing, while the model catalog says some models inherit upstream terms; therefore the selected model assets must be checked individually. Bundle the selected assets under `public/models/` or copy them during a deterministic build step so inference never needs a third-party CDN. If a particular model asset cannot be redistributed under its stated terms, replace that asset before release.

### Detection, recognition, and fusion

- **Object detection:** run the actual COCO model; show its returned class, detector confidence, and bounding box. The supported classes are limited to the selected model's label set. The `person` object class is not a face identity.
- **Face detection:** show every face box and detector confidence supported by the runtime's configured maximum-face count.
- **Face recognition:** compare each returned descriptor against stored descriptors using the Human matching function. For each profile, retain its best template score; do not use an arbitrary name or random result. The initial recognition threshold is `0.62` on the library's normalized similarity output, configurable from `0.40` to `0.90`. This is a conservative starting point, not a calibrated accuracy claim. If the best score misses threshold or is too close to the next profile (initial margin `0.05`), return Unknown.
- **Score semantics:** detector confidence and identity similarity are separate values and are labeled separately in UI, history, exports, and docs.
- **Face/person association:** match a face box to a detected `person` box by overlap/containment. If no person box is available, the face result remains a face result and is not relabeled as a whole-body person detection.
- **Tracking:** associate boxes across frames with an explicit IoU/centroid tracker; issue temporary IDs, retain first/last-seen times, and expire tracks after a configurable absence interval. Track IDs are not identity claims.
- **Vision Fusion:** run object detection and face analysis in the same cycle and present independently typed results. A detected bottle and a recognized face can coexist without one result changing the other.

### Enrollment and quality

Enrollment requires explicit user action. Capture 3–5 samples from one primary face, with prompts for front/left/right poses. Reject a sample unless one face is detected, the face is sufficiently large, lighting and sharpness heuristics pass, and pose is within the current prompt's range. Quality scores are transparent heuristics, not a liveness or spoof check. Store descriptors and quality metadata; discard source camera frames after feature extraction. A profile portrait is optional and added separately or captured only after an explicit portrait action.

Before saving, compare the new templates to existing profiles and show likely duplicates for user review. Never merge or delete automatically. Re-enrollment replaces or augments templates for the chosen profile after confirmation.

### Runtime cadence and resilience

- Use a dedicated worker for inference where the selected runtime/browser supports it; transfer downscaled `ImageBitmap` frames and close them promptly. Provide a serial, throttled main-thread fallback.
- Never enqueue a new inference frame while an earlier inference call is pending.
- Default input size is capped at 640×480, with a 180 ms inference interval; settings expose performance/balanced presets by changing real resolution and interval values. Drawing may refresh independently with `requestAnimationFrame`.
- Report measured inference FPS, per-pass latency, and total processing latency. Do not hardcode dashboard metrics or claim a minimum FPS.
- Model states include loading, ready, unsupported backend, model-load error, slow device, and retry. WebGL/WebGPU/WASM support is capability-detected; fallback or a clear compatibility message is required.

## Data model and privacy

Use Dexie 4 and IndexedDB for structured data and binary portrait blobs. Do not store profiles, embeddings, event history, or images in `localStorage`. Theme may use local storage if necessary; settings are persisted in the app database.

### `PersonProfile`

`id` (internal UUID), `personId` (user-visible unique ID), `name`, `role`, `department`, `email?`, `phone?`, `organization?`, `metadata`, `photoBlob?`, `createdAt`, `updatedAt`, `lastDetectedAt?`, `consentRecordedAt`, and `isDemo`.

### `FaceTemplate`

`id`, `personId`, `descriptor` (typed numeric vector), `quality`, `pose`, `createdAt`, `modelId`, and `isDemo=false`. Demo profiles never receive fabricated templates.

### `DetectionEvent`

`id`, `timestamp`, `type` (`face_detected`, `person_recognized`, `unknown_face`, or `object_detected`), `label`, `personId?`, `trackId?`, `detectorConfidence?`, `recognitionSimilarity?`, `boundingBox?`, `mode`, and `isDemo`. Never store a camera frame, face crop, embedding, or raw QR payload in an event.

### `VisionSettings`

Versioned configuration for object threshold, recognition threshold, unknown-match margin, maximum samples, face quality gates, resolution, inference interval, camera choice/facing mode, overlay toggles, theme, and event retention. Values are validated, bounded, and migrated when the schema changes.

### QR payload

Use versioned JSON with a required `version: 1`, normalized `person_id` and `name`, optional role/department/email/phone/organization, and bounded plain-text metadata. Enforce an 8 KiB limit and validate all fields before preview/save. QR codes do not carry embeddings or photos. A portrait is selected/captured separately. Invalid JSON, unsupported versions, missing required fields, duplicate IDs, and oversized payloads show a recoverable error state.

### Local data controls

- Export history as CSV/JSON and profile metadata as JSON; omit biometric embeddings by default.
- Offer an explicit separate control for cached model assets, since they are not personal records.
- Delete one profile removes its templates, avatar, and linked events after confirmation.
- “Reset demo data” deletes only seeded demo records and re-seeds labeled demo profiles/events; it does not touch user records.
- “Delete all local data” clears app tables/settings, requires confirmation, and stops the camera/inference first.
- Provide a privacy notice before camera recognition starts and always show when the camera or identity mode is active.

## Demo data and no-fake-functionality rule

Seed three fictional profiles, settings, object labels, and a small labeled history using local JSON. Seed profiles are un-enrolled and contain no portraits or embeddings. Seeded history is always visibly marked as demo. A user must enroll a face through actual model inference before the live app can recognize them. Demo mode never substitutes a simulated detection for missing model output.

## Error handling and accessibility

Handle camera permission denial, no camera, disconnected camera, unsupported browser, model download/load failure, missing WebGL/WebGPU, database open/quota failure, corrupt QR, invalid form, duplicate ID, failed inference, and empty data without a blank screen. Provide a clear message, retry or fallback action, and development-only diagnostics without logging embeddings or contact fields.

All navigation and controls support keyboard use, visible focus, accessible labels/status updates, responsive desktop/tablet/mobile layout, adequate contrast, reduced-motion preference, and screen-reader-friendly dialogs/toasts. Keep camera privacy status visible on mobile and desktop.

## Configuration defaults

Store defaults centrally and expose applicable values in Settings:

```ts
const VISION_CONFIG = {
  objectThreshold: 0.50,
  recognitionThreshold: 0.62,
  unknownMatchMargin: 0.05,
  maxEnrollmentSamples: 5,
  inferenceIntervalMs: 180,
  maxInputWidth: 640,
  maxInputHeight: 480,
  trackExpiryMs: 1800,
  qrPayloadMaxBytes: 8192,
} as const;
```

Face size, brightness, sharpness, and pose gates are also named configuration fields, not scattered constants. Quality thresholds will be documented as heuristics and kept configurable for calibration.

## Deployment and operations

- Root is the Vite application; no backend or API routes.
- `vercel.json` configures SPA path rewrites so direct links to profile/history/settings work on refresh.
- Model/WASM assets use same-origin URLs and explicit cache headers. Do not fetch input images, camera frames, profiles, or model results from third-party services.
- `.env.example` explains that no environment variables are required in local mode; never add a secret to Vite client variables.
- `setup.ps1` and `setup.bat` check supported Node/npm versions, install locked dependencies, and print run/build/test/PDF commands. Python is not a runtime requirement.
- README includes exact commands: `npm ci`, `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run preview`, plus Vercel import/CLI steps and camera troubleshooting.
- Git hygiene excludes `node_modules`, build outputs, test artifacts, local databases, private portraits, model caches, `.env.local`, and generated LaTeX intermediates. Public model assets and their notices remain versioned.

## Testing strategy

Automated tests are part of the deliverable, as explicitly requested:

- **Unit:** QR schema/size/invalid JSON, form normalization, settings bounds/migration, descriptor lengths, Human similarity mapping, recognized/unknown/ambiguous thresholds, duplicate warning, quality gates, IoU association, event aggregation/dedup, CSV/JSON export redaction.
- **Repository integration:** profile/template/event CRUD, atomic profile deletion, demo reset isolation, settings updates, schema upgrade, and quota/open failure handling.
- **Feature integration:** QR payload → validated profile preview → saved profile; profile → camera enrollment state machine → stored templates; inference result → per-face identity and object events; history filter/export; settings → actual inference config.
- **UI:** route navigation, forms, dialogs, loading states, camera permission errors, no-camera state, model failure, QR start/stop, keyboard/focus behavior, mobile menu, theme, and local-data confirmation.
- **Browser end-to-end:** run in Playwright with deterministic mocked camera/model adapters for permission/stream flows. An opt-in real-device smoke checklist verifies actual model download, camera frames, face enrollment, actual detection, stop/release, and offline repeat after model caching. Test fakes stay within tests and are never displayed as live inference.
- **Build gates:** type check, lint, unit/integration/UI suites, production build, route-refresh smoke, and LaTeX/PDF build+render inspection.

## Limitations

The detector and face model only know their training classes/data; quality depends on light, distance, pose, occlusion, model/browser/hardware, and thresholds. Similarity thresholds are model-specific and not calibrated from user evaluation data. A browser-local database belongs to one browser profile/device and can be removed by browser storage cleanup; there is no account backup or synchronization. A match is not authentication, and the app makes no perfect-accuracy or fairness guarantee.

## Current documentation used for design

Verified on 2026-10-02 from primary/official sources:

- Vercel Vite support and SPA rewrites: <https://vercel.com/docs/frameworks/frontend/vite>
- Human browser processing, API, model catalog, matching, MIT package/repository license, and privacy behavior: <https://github.com/vladmandic/human>, <https://github.com/vladmandic/human/wiki/Embedding>, <https://github.com/vladmandic/human/wiki/Models>, <https://github.com/vladmandic/human/security>
- Dexie TypeScript/IndexedDB: <https://dexie.org/docs/Typescript>
- ZXing browser camera QR reader: <https://github.com/zxing-js/browser>
- Tailwind Vite integration: <https://tailwindcss.com/docs/installation/using-vite>
- React Router modes: <https://reactrouter.com/start/modes>
- ONNX Runtime Web alternatives and provider/browser limitations: <https://onnxruntime.ai/docs/tutorials/web/>

