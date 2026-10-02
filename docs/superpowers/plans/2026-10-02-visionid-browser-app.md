# VisionID AI Browser Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Deliver a polished local-first VisionID AI application with genuine browser-side object/face inference, opt-in enrollment and conservative recognition, QR workflows, local records/history, privacy controls, Vercel deployment preparation, automated tests, and complete setup documentation.

**Architecture:** A root-level Vite React TypeScript SPA uses React Router and Tailwind. A typed AI adapter wraps the selected Human browser runtime and same-origin model assets. Dexie/IndexedDB repositories own profiles, face templates, events, and settings. Camera frames remain in browser memory and are not persisted; Vercel serves static files and client routes with no runtime API or separate Python service.

**Tech Stack:** Node.js 22.12 or later, npm, React, TypeScript, Vite, React Router, Tailwind CSS, Dexie 4, ZXing Browser, @vladmandic/human, Vitest, Testing Library, Playwright, and Vercel static hosting. Resolve and pin mutually compatible versions during implementation; document the exact versions, models, class labels, sources, and licenses that ship.

**Spec:** docs/superpowers/specs/2026-10-02-visionid-browser-app-design.md

## Global Constraints

- Keep v1 local-first and single-device: no accounts, shared cloud directory, remote inference, frame upload, telemetry, or Python runtime.
- Use real inference for live results. Seed profiles are fictional and un-enrolled; seed events are labeled demo data; never fabricate a live result, confidence, descriptor, or identity.
- Keep detector confidence and recognition similarity distinct in types, UI, history, exports, and report.
- Enable only face detection, landmarks/descriptors, and the selected COCO object detector. Do not enable sensitive attribute inference.
- Verify every bundled model asset's redistribution terms, source, exact version, attribution, class set, and SHA-256 before including it; document in docs/MODEL_NOTICES.md.
- Store biometric descriptors only after explicit enrollment. Discard camera frames after inference. Do not store frames, descriptors, or raw QR payloads in event records or default exports.
- Use bounded, centrally defined settings, typed replaceable adapters, accessible recoverable errors, and actual measured metrics.
- Treat recognition threshold 0.62 and ambiguity margin 0.05 as configurable starting values, not calibrated accuracy claims. Recognition is not authentication and quality heuristics are not liveness checks.
- Automated tests may use deterministic mock camera/model adapters, but the product must never expose these as live detections.

## Review Focus

- Malformed or legacy IndexedDB records, invalid vectors, and settings from an older schema must migrate or fail safely; pin with Task 2 migration/repository tests.
- A camera removed while a frame is being processed must stop new inference, release tracks, and show a recoverable status; pin with Task 4 camera tests.
- Two enrolled identities with close scores must resolve to Unknown rather than selecting a weak winner; pin with Task 5 matcher tests.
- Unicode payload byte limits, malformed QR fields, and duplicate IDs must be validated before persistence; pin with Task 3 parser and UI tests.
- A deleted profile must not regain linked events/templates from a stale in-flight result, clear-all must stop inference first, and clearing model cache must preserve personal data; pin with Tasks 7ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“8 integration tests.

---

### Task 1: Scaffold the SPA and visual foundation

**Files:** Create package.json, package-lock.json, index.html, vite.config.ts, vitest.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, eslint.config.js, tests/setup.ts, src/main.tsx, src/app/App.tsx, src/app/router.tsx, src/app/AppShell.tsx, src/app/RouteErrorBoundary.tsx, src/pages/RouteShellPage.tsx, src/styles/tokens.css, src/styles/index.css, public/favicon.svg, vercel.json, .gitignore, and tests/ui/navigation/router.test.tsx.

**Interfaces:** Export appRouter from src/app/router.tsx with the routes in the approved spec. AppShell renders navigation, main landmark, route outlet, title, theme, and toast region. RouteErrorBoundary presents a recoverable error with reset navigation.

- [x] Step 1: Bootstrap package.json/package-lock.json with pinned React, Vite, TypeScript, Vitest, Testing Library, Playwright, Tailwind Vite plugin, and lint dependencies; add scripts named dev, build, preview, test (Vitest run), lint, typecheck, and test:e2e. Configure only the minimum Vite/test setup needed to run tests.
- [x] Step 2: Write rendersRequiredRoutes and unknownRouteShowsAccessibleNotFound tests. Assert a named main landmark, all eight route headings, and a home link on an unknown route.
- [x] Step 3: Run npm test -- --run tests/ui/navigation/router.test.tsx. Expected: FAIL because appRouter and route pages do not exist.
- [x] Step 4: Create strict TypeScript config, ESLint, Tailwind Vite integration, app shell/router, route shells, error boundary, responsive navigation, focus states, reduced motion, theme tokens, not-found page, Vercel SPA rewrite, and static asset cache rules.
- [x] Step 5: Run npm test -- --run tests/ui/navigation/router.test.tsx, npm run typecheck, npm run lint, and npm run build. Expected: PASS with all named routes resolving and production assets building.
- [x] Step 6: Commit Task 1 files as feat: scaffold VisionID browser application.

### Task 2: Define domain contracts and local repositories

**Files:** Create src/types/person.ts, src/types/vision.ts, src/types/events.ts, src/types/settings.ts, src/config/vision.ts, src/data/db.ts, src/data/migrations.ts, src/data/repositories/peopleRepository.ts, src/data/repositories/templateRepository.ts, src/data/repositories/eventRepository.ts, src/data/repositories/settingsRepository.ts, tests/unit/config/settings.test.ts, tests/unit/data/schema.test.ts, and tests/integration/repositories/repositories.test.ts.

**Interfaces:** PersonProfile has id, personId, name, role, department, email, phone, organization, metadata, photoBlob, createdAt, updatedAt, lastDetectedAt, consentRecordedAt, and isDemo. FaceTemplate has id, personId, Float32Array descriptor, quality, pose, createdAt, modelId, and isDemo. BoundingBox is { x, y, width, height }. FaceResult is { box, detectorConfidence, landmarks?, descriptor? }. ObjectResult is { box, className, modelClassId, detectorConfidence }. DetectionEvent has id, timestamp, type, label, personId, trackId, detectorConfidence, recognitionSimilarity, boundingBox, mode, and isDemo. VisionSettings has objectThreshold, recognitionThreshold, unknownMatchMargin, maxEnrollmentSamples, faceQuality, maxInputWidth, maxInputHeight, inferenceIntervalMs, trackExpiryMs, cameraId, cameraFacingMode, modelVariant, overlay flags, theme, and eventRetentionDays. Repositories export createProfile, getProfile, updateProfile, deleteProfileCascade, listProfiles, saveTemplates, listTemplatesForPerson, addEvents, queryEvents, getSettings, and saveSettings with typed async results.

- [x] Step 1: Write tests named clampsThresholdsAndRejectsInvalidSettings, migratesLegacySettings, rejectsMalformedDescriptors, deleteProfileCascadeRemovesLinkedRows, and reportsIndexedDbOpenFailure. Assert the exact initial values from the approved spec and deletion of all linked rows in one transaction.
- [x] Step 2: Run npm test -- --run tests/unit/config/settings.test.ts tests/unit/data/schema.test.ts tests/integration/repositories/repositories.test.ts. Expected: FAIL because types, database, and repositories are absent.
- [x] Step 3: Implement the domain types and Dexie v1 schema/migrations. Validate all persisted settings, profile IDs, metadata sizes, descriptor model IDs/lengths, and event score semantics. Add transactional cascade deletion and structured IndexedDB/quota errors.
- [x] Step 4: Run npm test -- --run tests/unit/config/settings.test.ts tests/unit/data/schema.test.ts tests/integration/repositories/repositories.test.ts, npm run typecheck, and npm run lint. Expected: PASS, including fake IndexedDB migration and transactional repository checks.
- [x] Step 5: Commit Task 2 files as feat: add typed local data layer.

### Task 3: Implement QR validation, scanner, and generator

**Files:** Create src/features/qr/qrSchema.ts, src/features/qr/qrService.ts, src/features/qr/QrScanner.tsx, src/features/qr/QrGenerator.tsx, tests/unit/qr/qrSchema.test.ts, tests/ui/qr/QrScanner.test.tsx, and tests/integration/qr/qrEnrollment.test.tsx.

**Interfaces:** Result<T, E> is { ok: true; value: T } | { ok: false; error: E }. parsePersonQr(payload: string, existingIds?: string[]): Result<ValidatedPersonPayload, QrValidationError>; createPersonQr(payload: ValidatedPersonPayload): string; QrScanner accepts onValidPayload and onError callbacks and exposes start/stop lifecycle internally. Version 1 allows person_id and name plus bounded optional role, department, email, phone, organization, and plain-text metadata only.

- [x] Step 1: Write parsesValidV1Payload, rejectsInvalidAndUnsupportedPayloads, enforcesUtf8ByteLimit, rejectsDuplicatePersonId, and roundTripsGeneratedQr tests. Include multibyte Unicode at the 8192-byte boundary; assert no photo, descriptor, arbitrary markup, or unknown root fields are accepted.
- [x] Step 2: Run npm test -- --run tests/unit/qr/qrSchema.test.ts. Expected: FAIL because parser/generator functions are absent.
- [x] Step 3: Implement byte-counting validation and normalization. Wrap ZXing Browser camera reader/writer with cleanup, selected device support, duplicate-decode suppression, accessible start/stop states, recoverable errors, and manual fallback. Show validated data in a preview before profile save.
- [x] Step 4: Run npm test -- --run tests/unit/qr tests/ui/qr tests/integration/qr and npm run typecheck. Expected: PASS for QR parse, scan states, generation, and profile preview.
- [x] Step 5: Commit Task 3 files as feat: add validated QR registration.

### Task 4: Add camera lifecycle and real browser inference adapter

**Files:** Create src/ai/engine/types.ts, src/ai/engine/humanEngine.ts, src/ai/engine/modelLoader.ts, src/ai/engine/modelManifest.ts, src/ai/engine/modelCache.ts, src/ai/worker/inference.worker.ts, src/features/camera/cameraService.ts, src/features/camera/useCamera.ts, src/features/vision/useVisionEngine.ts, public/vision-cache-sw.js, public/models/*, docs/MODEL_NOTICES.md, tests/unit/ai/engine.test.ts, tests/integration/camera/cameraService.test.ts, tests/integration/ai/modelLoading.test.ts, and tests/integration/ai/modelCache.test.ts.

**Interfaces:** VisionEngine exports initialize(): Promise<void>, detect(input: ImageBitmap | HTMLVideoElement): Promise<FrameResult>, status(): ModelStatus, configure(settings: VisionSettings): Promise<void>, and dispose(): Promise<void>. FrameResult has faces, objects, modelId, inferenceStartedAt, inferenceFinishedAt, and warnings. CameraService exports enumerateCameras, startCamera, stopCamera, and subscribeToCameraStatus. ModelCache exports cacheModelAssets(manifest): Promise<void> and clearModelCache(): Promise<void>; the service worker caches only versioned, manifest-listed same-origin model/WASM URLs in a named Cache Storage cache.

- [x] Step 1: Write mapsRealModelOutputsWithoutInventingResults, disablesUnrequestedHumanModules, handlesModelLoadFailureAndRetry, serializesInference, stopsOnDeviceRemoval, releasesTracksOnStop, cachesOnlyAllowlistedSameOriginAssets, and clearModelCachePreservesPersonalData tests. Expected: FAIL because adapter, camera service, and cache are absent.
- [x] Step 2: Run npm test -- --run tests/unit/ai/engine.test.ts tests/integration/camera tests/integration/ai/modelLoading.test.ts tests/integration/ai/modelCache.test.ts. Expected: FAIL on missing engine, lifecycle, and cache behavior.
- [x] Step 3: Verify the selected Human APIs, browser backends, exact package/model versions, licenses, model classes, and asset terms against current primary documentation. Bundle only distributable assets, write source/version/attribution/SHA-256 notices, and configure same-origin model/WASM URLs. Implement the adapter using only face detection/landmarks/descriptors and object detection; never configure sensitive attributes.
- [x] Step 4: Implement getUserMedia with front/rear camera selection, track-ended/device-removal handling, route cleanup, and retry. Add worker + transferable downscaled ImageBitmap where supported, serial throttled main-thread fallback otherwise, no queued overlapping frame, and bitmap close in finally.
- [x] Step 5: Register the versioned same-origin model-cache service worker and implement cacheModelAssets/clearModelCache with a strict manifest URL allowlist; cache no camera, profile, or QR data.
- [x] Step 6: Run npm test -- --run tests/unit/ai/engine.test.ts tests/integration/camera tests/integration/ai/modelLoading.test.ts tests/integration/ai/modelCache.test.ts, npm run typecheck, and npm run lint. Expected: PASS; verify only same-origin model requests and no camera-frame or profile-data requests to third parties.
- [x] Step 7: Commit Task 4 files as feat: add local browser vision engine.

### Task 5: Implement face quality, conservative matching, tracking, and fusion

**Files:** Create src/ai/recognition/matcher.ts, src/ai/recognition/quality.ts, src/ai/recognition/duplicates.ts, src/ai/tracking/boxTracker.ts, src/ai/fusion/associateFacePerson.ts, src/ai/fusion/aggregateEvents.ts, tests/unit/recognition/matcher.test.ts, tests/unit/recognition/quality.test.ts, tests/unit/tracking/boxTracker.test.ts, and tests/unit/fusion/aggregateEvents.test.ts.

**Interfaces:** EnrolledProfile is { personId: string; templates: FaceTemplate[] }. matchFace(descriptor: Float32Array, profiles: EnrolledProfile[], config: RecognitionConfig): RecognitionDecision returns recognized/personId/similarity, unknown/bestSimilarity, or ambiguous/bestSimilarity/runnerUpSimilarity. RecognitionService exports recognizeFaces(faces: FaceResult[], profiles: EnrolledProfile[], config: RecognitionConfig): RecognitionDecision[]. assessFaceQuality(face: FaceResult, frame: ImageData, prompt: PosePrompt, config: QualityConfig): QualityReport. updateTracks(previous: Track[], detections: Detection[], now: number, config: TrackingConfig): Track[] assigns temporary IDs and expires absent tracks. associateFacePerson(face, personBoxes): string | undefined only returns a person track when containment/overlap passes the configured gate.

- [x] Step 1: Write returnsUnknownBelowThreshold, returnsUnknownWhenTopMatchesAreTooClose, comparesEachFaceIndependently, rejectsInvalidOrMismatchedVectors, appliesNamedQualityGates, associatesOverlappingBoxes, expiresMissingTracks, and deduplicatesEvents tests. Include zero vectors, one template, multiple templates, multiple people, and two faces in one frame.
- [x] Step 2: Run npm test -- --run tests/unit/recognition tests/unit/tracking tests/unit/fusion. Expected: FAIL because matcher, quality, tracker, and event aggregation are absent.
- [x] Step 3: Normalize only the documented Human similarity output in one adapter function; compare every face to every template and retain each profile's best template score. Return Unknown when best score is below 0.62 or the next-best margin is below 0.05. Keep thresholds configurable and scores distinctly typed.
- [x] Step 4: Implement transparent size/brightness/sharpness/pose quality heuristics, duplicate candidate review without auto-merge, IoU/centroid track association with temporary IDs and 1800 ms expiry, face/person containment association, and event deduplication.
- [x] Step 5: Run npm test -- --run tests/unit/recognition tests/unit/tracking tests/unit/fusion and npm run typecheck. Expected: PASS for matcher, quality, tracking, and fusion behavior.
- [x] Step 6: Commit Task 5 files as feat: add recognition and detection result logic.

### Task 6: Deliver opt-in enrollment, directory, and profile views

**Files:** Create src/features/enrollment/EnrollmentPage.tsx, src/features/enrollment/EnrollmentFlow.tsx, src/features/enrollment/ManualProfileForm.tsx, src/features/enrollment/SampleCapture.tsx, src/features/enrollment/FaceQualityPanel.tsx, src/features/people/PeopleDirectoryPage.tsx, src/features/people/PeopleDirectory.tsx, src/features/people/PersonProfilePage.tsx, src/features/people/ProfileEditor.tsx, tests/integration/enrollment/enrollmentFlow.test.tsx, tests/ui/enrollment/EnrollmentPage.test.tsx, and tests/ui/people/PeopleDirectory.test.tsx.

**Interfaces:** EnrollmentFlow accepts an optional ValidatedPersonPayload and requires explicit consent before starting camera recognition. It saves 3ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“5 quality-approved descriptors from one primary face through the VisionEngine and template repository; source frames are discarded. PeopleDirectory reads profiles/events through repositories and exposes search/filter/sort/select. PersonProfilePage is keyed by personId and shows profile, enrollment state, and linked event history.

- [x] Step 1: Write qrPreviewRequiresExplicitSave, consentPrecedesCapture, rejectsPoorSampleAndOffersRetry, storesOnlyQualityApprovedDescriptors, cancellationReleasesCamera, reEnrollmentRequiresConfirmation, editingUpdatesProfile, deletingProfileRemovesTemplatesAndEvents, and storesAnOptionalPortraitOnlyWhenSelected tests.
- [x] Step 2: Run npm test -- --run tests/integration/enrollment tests/ui/enrollment tests/ui/people. Expected: FAIL because enrollment and people flows are absent.
- [x] Step 3: Implement QR/manual profile entry, consent/privacy notice, duplicate review, front/left/right guided capture, quality feedback, descriptor generation, explicit success/failure/progress, optional separately opted-in portrait upload, and template save. Demo profiles remain without templates.
- [x] Step 4: Implement searchable/filterable/sortable directory, profile detail/edit/delete/re-enroll, recognition statistics and detection history. Cascade deletion uses deleteProfileCascade and confirmation.
- [x] Step 5: Run npm test -- --run tests/integration/enrollment tests/ui/enrollment tests/ui/people, npm run typecheck, and npm run lint. Expected: PASS for complete enrollment and profile management.
- [x] Step 6: Commit Task 6 files as feat: add face enrollment and people directory.

### Task 7: Build Vision Fusion and object detection consoles

**Files:** Create src/features/vision/VisionConsolePage.tsx, src/features/vision/CameraStage.tsx, src/features/vision/DetectionOverlay.tsx, src/features/vision/InferenceLoop.ts, src/features/vision/MetricsBar.tsx, src/features/vision/ResultPanel.tsx, src/features/vision/VisionControls.tsx, src/features/objects/ObjectDetectionPage.tsx, src/features/objects/ObjectDetailsPanel.tsx, tests/integration/vision/InferenceLoop.test.ts, tests/ui/console/VisionConsolePage.test.tsx, and tests/ui/objects/ObjectDetectionPage.test.tsx.

**Interfaces:** InferenceLoop consumes HTMLVideoElement, VisionEngine, RecognitionService, repositories, and VisionSettings; exposes start(), stop(), and onFrame(FrameViewModel). FrameViewModel contains separate faces/objects, event delta, actual inference latency, total latency, measured FPS, and engine state. InferenceLoop also exports stopActiveVision(): Promise<void> and invalidates a session epoch before awaiting pending work, so stale results cannot write events. CameraStage draws the video and returned overlay on a separate canvas. ObjectDetailsPanel displays class, detector confidence, bounding box, temporary track ID, first-seen time, and last-seen time when available.

- [x] Step 1: Write neverOverlapsFrames, throttlesInferenceToSettings, drawsScaledBoxes, showsUnknownAndRecognizedSeparately, handlesIndependentFacesAndObjects, derivesMetricsFromTiming, rendersEmptyResultsWhenEngineReturnsNone, stopReleasesCamera, and stopActiveVisionInvalidatesEveryCurrentLoop tests.
- [x] Step 2: Run npm test -- --run tests/integration/vision tests/ui/console tests/ui/objects. The focused suite now passes with actual adapter contracts and test-only camera/model doubles.
- [x] Step 3: Implement one serial inference loop, capped frame input, independently refreshed overlay drawing, actual detector/recognizer invocation, deduplicated event writes, class/face counts, temporary tracking labels, per-object details, measured FPS/latency, and Fusion/Object modes.
- [x] Step 4: Add model loading/progress/retry/unsupported/slow states, permission/no-camera/device-loss states, camera controls, active privacy status, and responsive panels. Empty results render status text without inventing detection cards.
- [x] Step 5: Run npm test -- --run tests/integration/vision tests/ui/console tests/ui/objects and npm run typecheck. Expected: PASS for inference cadence, overlays, results, and state handling.
- [x] Step 6: Commit Task 7 files as feat: add vision fusion and object console.

### Task 8: Complete settings, history, exports, demo seed, and privacy controls

**Files:** Create src/features/history/DetectionHistoryPage.tsx, src/features/history/HistoryFilters.tsx, src/features/history/eventExport.ts, src/features/settings/SettingsPage.tsx, src/features/settings/DataControls.tsx, src/features/settings/PrivacyNotice.tsx, src/features/dashboard/AnalyticsPanel.tsx, src/data/seed/demoData.ts, src/data/seed/seedDemoData.ts, tests/unit/history/eventExport.test.ts, tests/integration/settings/settings.test.ts, tests/integration/settings/dataLifecycle.test.ts, tests/ui/privacy/DataControls.test.tsx, tests/ui/dashboard/analytics.test.tsx, and data/demo_people.json and data/demo_objects.json.

**Interfaces:** exportEventsCsv and exportEventsJson omit descriptors and frames; exportPeopleJson omits biometrics by default; exportSessionReport returns an aggregate summary without biometric data. resetDemoData deletes/reseeds only isDemo rows. clearAllLocalData first awaits stopActiveVision(), then transactionally clears app tables/settings. applySettings(settings, engine) persists validated settings and configures active inference.

- [ ] Step 1: Write eventFiltersAndRetention, csvEscapesUserText, exportsOmitBiometrics, exportsSessionSummaryWithoutBiometrics, resetDemoPreservesEnrolledPeople, clearAllStopsInferenceFirst, deletingDuringInflightInferenceCannotRecreateEvents, clearModelCachePreservesPersonalData, and settingsReconfigureEngine tests.
- [ ] Step 2: Run npm test -- --run tests/unit/history tests/integration/settings tests/ui/privacy. Expected: FAIL because these features are absent.
- [ ] Step 3: Implement filterable history, details, timeline/summary analytics, CSV/JSON event export, profile JSON export, and a basic session report with separate score fields and biometric redaction. Seed three fictional un-enrolled profiles and clearly labeled demo events.
- [ ] Step 4: Implement bounded recognition/object thresholds, camera, real resolution/cadence performance presets, manifest-supported model selection, overlays, theme, quality gates, retention, model/cache status, privacy notice, and data actions. Demo reset preserves user records; clear-all stops inference before deleting everything; Clear Model Cache removes only the model cache and preserves personal tables.
- [ ] Step 5: Add real-time dashboard analytics for persons/faces/objects, recognized/unknown counts, separate detector-confidence and recognition-similarity charts, measured FPS/latency, recent events, detection timeline, and object distribution. Label seeded analytics as demo.
- [ ] Step 6: Run npm test -- --run tests/unit/history tests/integration/settings tests/ui/privacy tests/ui/dashboard, npm run typecheck, and npm run lint. Expected: PASS; inspect exports to confirm vectors, camera data, and raw QR text are absent.
- [ ] Step 7: Commit Task 8 files as feat: add local history settings and privacy controls.

### Task 9: Finish landing page, accessibility, responsive UX, and errors

**Files:** Create src/pages/LandingPage.tsx, src/pages/NotFoundPage.tsx, src/components/ConfirmDialog.tsx, src/components/StatusBadge.tsx, src/components/EmptyState.tsx, src/components/LoadingState.tsx, src/components/ToastProvider.tsx, tests/ui/accessibility/navigation.test.tsx, tests/ui/accessibility/dialogs.test.tsx, tests/ui/responsive/layout.test.tsx, and tests/ui/errors/recovery.test.tsx.

**Interfaces:** Shared status/dialog/loading components provide keyboard and ARIA behavior, never own application persistence. Landing page exposes Start Vision, Enroll Person, Scan QR, and Object Detection actions and the local-processing/not-authentication notice.

- [ ] Step 1: Write keyboardNavigatesEveryPrimaryAction, dialogsManageFocusAndEscape, reducedMotionDisablesDecorativeMotion, responsiveNavigationWorks, and failuresOfferRecoveryAction tests.
- [ ] Step 2: Run npm test -- --run tests/ui/accessibility tests/ui/responsive tests/ui/errors. Expected: FAIL for missing shared components and incomplete accessibility states.
- [ ] Step 3: Implement landing guidance and contextual tooltips, consistent loading/empty/error/success states, subtle scanning/model activity indicators, accessible confirmation dialogs/toasts/status badges, focus management, contrast, visible focus, reduced motion, and desktop/tablet/mobile layouts.
- [ ] Step 4: Verify every control has an action or a clear disabled reason. Run npm test -- --run tests/ui/accessibility tests/ui/responsive tests/ui/errors and npm run typecheck. Expected: PASS at all configured viewports.
- [ ] Step 5: Commit Task 9 files as feat: polish VisionID accessible experience.

### Task 10: Add setup, Vercel, documentation, and end-to-end smoke flow

**Files:** Create setup.ps1, setup.bat, .env.example, LICENSE, README.md, docs/ARCHITECTURE.md, playwright.config.ts, tests/e2e/appFlows.spec.ts, and .github/workflows/ci.yml if repository CI is enabled.

**Interfaces:** setup scripts check Node/npm and install via npm ci. E2E tests install deterministic mock adapters only in the test build and cover route refresh, permission/model errors, QR/manual preview, demo data, history/export, and delete confirmation. README commands match package scripts exactly.

- [ ] Step 1: Write Playwright test appStartsAndRoutesRefresh, enrollmentFlowUsesTestAdapters, errorStatesRecover, and deleteAllRequiresConfirmation. Run npm run test:e2e -- --grep "appStartsAndRoutesRefresh". Expected: FAIL because browser project/configuration is absent.
- [ ] Step 2: Implement Windows scripts, .env.example explaining no variable is needed in local mode, README installation/dev/test/build/Vercel/privacy/troubleshooting instructions, and architecture/data-flow documentation. Add CI for typecheck, lint, unit/UI, E2E, and production build where supported.
- [ ] Step 3: Run npm ci; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e. Expected: all pass from clean install. Run setup.ps1 and setup.bat where available; verify Vercel build and direct-route refresh against current official docs.
- [ ] Step 4: Commit Task 10 files as docs: prepare VisionID setup and deployment.

### Task 11: Perform final application verification

**Files:** all app files; update docs/superpowers/plans/2026-10-02-visionid-browser-app.md with actual completion state.

**Interfaces:** No new product interfaces. The final verification report records exact command output and marks unavailable real-camera/model checks as not performed, not passed.

- [ ] Step 1: Run npm ci, npm run typecheck, npm run lint, npm test, npm run test:e2e, npm run build, and npm run preview. Expected: every automated check passes and the preview directly loads each route after refresh.
- [ ] Step 2: On available browser hardware, manually check same-origin model loading, real camera start/stop, actual object/face inference, opt-in enrollment, recognized/unknown logic, QR rejection, persistence, export redaction, and clear-all. Record limitations if hardware is unavailable.
- [ ] Step 3: Inspect network traffic and model notices for third-party frame/data requests, missing license/hash/source records, stale event writes after deletion, and demo templates. Expected: no external frame/profile requests; demo profiles have no embeddings.
- [ ] Step 4: Commit final verification records as chore: verify VisionID browser application.
