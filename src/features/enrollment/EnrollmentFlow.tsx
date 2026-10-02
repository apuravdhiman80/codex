import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_VISION_SETTINGS, VISION_CONFIG } from "../../config/vision";
import { loadVisionEngine } from "../../ai/engine/modelLoader";
import { findDuplicateCandidates } from "../../ai/recognition/duplicates";
import { isValidFaceDescriptor } from "../../ai/recognition/matcher";
import { assessFaceQuality, type PosePrompt, type QualityReport } from "../../ai/recognition/quality";
import type { ModelStatus } from "../../ai/engine/types";
import { MODEL_ID } from "../../ai/engine/modelManifest";
import type { PersonProfile, NewFaceTemplate } from "../../types/person";
import type { VisionSettings } from "../../types/vision";
import type { CameraSession } from "../camera/cameraService";
import type { ValidatedPersonPayload } from "../qr/qrSchema";
import { resolveEnrollmentServices, facingModeConstraints, type EnrollmentServices } from "./enrollmentServices";
import { SampleCapture } from "./SampleCapture";

interface EnrollmentFlowProps {
  payload?: ValidatedPersonPayload;
  existingProfile?: PersonProfile;
  settings?: VisionSettings;
  services?: Partial<EnrollmentServices>;
  onCancel?: () => void;
  onComplete?: () => void;
}

type EnrollmentStage = "review" | "confirm_reenrollment" | "ready" | "capturing" | "complete";
type CapturedSample = NewFaceTemplate;

const SAMPLE_PROMPTS: readonly PosePrompt[] = ["front", "left", "right", "front", "left"];

export function EnrollmentFlow({
  payload,
  existingProfile,
  settings = DEFAULT_VISION_SETTINGS,
  services: serviceOverrides,
  onCancel,
  onComplete,
}: EnrollmentFlowProps) {
  const services = useMemo(() => resolveEnrollmentServices(serviceOverrides), [serviceOverrides]);
  const [profile, setProfile] = useState<PersonProfile | undefined>(existingProfile);
  const [stage, setStage] = useState<EnrollmentStage>(existingProfile ? "confirm_reenrollment" : "review");
  const [consent, setConsent] = useState(false);
  const [portraitEnabled, setPortraitEnabled] = useState(false);
  const [portraitBlob, setPortraitBlob] = useState<Blob>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [samples, setSamples] = useState<CapturedSample[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [qualityReport, setQualityReport] = useState<QualityReport>();
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ state: "idle", message: "Models have not loaded.", progress: 0, activeModels: [] });
  const [duplicateCandidates, setDuplicateCandidates] = useState<Array<{ personId: string; name: string; similarity: number }>>([]);
  const [duplicateReviewed, setDuplicateReviewed] = useState(false);
  const [duplicateCheckCompleted, setDuplicateCheckCompleted] = useState(false);
  const [completedSampleCount, setCompletedSampleCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | undefined>(undefined);
  const engineRef = useRef<ReturnType<EnrollmentServices["createEngine"]> | undefined>(undefined);
  const samplesRef = useRef<CapturedSample[]>([]);
  const prompt = SAMPLE_PROMPTS[Math.min(promptIndex, SAMPLE_PROMPTS.length - 1)]!;
  const isReEnrollment = Boolean(existingProfile);
  const visibleName = existingProfile?.name ?? payload?.name ?? "Person";

  useEffect(() => {
    const unsubscribe = services.camera.subscribeToCameraStatus(() => undefined);
    return () => {
      unsubscribe();
      const session = sessionRef.current;
      sessionRef.current = undefined;
      if (session?.active) services.camera.stopCamera(session);
      const engine = engineRef.current;
      engineRef.current = undefined;
      if (engine) void engine.dispose();
      samplesRef.current.forEach((sample) => sample.descriptor.fill(0));
      samplesRef.current = [];
    };
  }, [services]);

  async function saveProfileAndContinue() {
    if (!payload || !consent || busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await services.createProfile({
        ...payload,
        ...(portraitEnabled && portraitBlob ? { photoBlob: portraitBlob } : {}),
        consentRecordedAt: Date.now(),
        isDemo: false,
      });
      setProfile(created);
      setStage("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The profile could not be saved locally.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReEnrollment() {
    if (!existingProfile || !consent || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await services.updateProfile(existingProfile.id, { consentRecordedAt: Date.now() });
      setProfile(updated);
      setStage("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Renewed consent could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function startCapture() {
    if (!profile || busy) return;
    setBusy(true);
    setError("");
    try {
      const engine = engineRef.current ?? services.createEngine(settings);
      engineRef.current = engine;
      await loadVisionEngine(engine, setModelStatus);
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview could not be prepared. Retry this step.");
      const session = await services.camera.startCamera(video, facingModeConstraints(settings.cameraFacingMode));
      sessionRef.current = session;
      setStage("capturing");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Camera or model initialization failed. Retry enrollment.");
      setModelStatus(engineRef.current?.status() ?? modelStatus);
    } finally {
      setBusy(false);
    }
  }

  async function captureSample() {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (!engine || !video || !sessionRef.current?.active || busy) return;
    setBusy(true);
    setError("");
    let frame: ImageData | undefined;
    try {
      const result = await engine.detect(video);
      if (result.faces.length !== 1) {
        setError(result.faces.length === 0
          ? "No face was detected. Center your face and try again."
          : "More than one face is visible. Capture only the person being enrolled.");
        setQualityReport(undefined);
        return;
      }
      const face = result.faces[0]!;
      frame = await services.captureFrame(video);
      const report = assessFaceQuality(face, frame, prompt, settings.faceQuality);
      setQualityReport(report);
      if (!report.ready) return;
      if (!face.descriptor || !isValidFaceDescriptor(face.descriptor)) {
        setError("The face descriptor was not valid. Keep the camera steady and retry this sample.");
        return;
      }
      const captured: CapturedSample = {
        descriptor: new Float32Array(face.descriptor),
        quality: report.score,
        pose: prompt,
        modelId: result.modelId,
      };
      const updated = [...samplesRef.current, captured];
      samplesRef.current = updated;
      setSamples(updated);
      setPromptIndex((current) => Math.min(current + 1, SAMPLE_PROMPTS.length - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The sample could not be captured. Try again.");
    } finally {
      frame?.data.fill(0);
      setBusy(false);
    }
  }

  async function findDuplicates(): Promise<Array<{ personId: string; name: string; similarity: number }>> {
    const engine = engineRef.current;
    if (!engine || !profile || samplesRef.current.length === 0) return [];
    const profiles = await services.listProfiles();
    const candidates: Array<{ personId: string; name: string; similarity: number }> = [];
    for (const other of profiles) {
      if (other.id === profile.id || other.isDemo) continue;
      const templates = await services.listTemplatesForPerson(other.id);
      const modelId = samplesRef.current[0]!.modelId || MODEL_ID;
      const best = samplesRef.current.reduce((highest, sample) => {
        const match = findDuplicateCandidates(sample.descriptor, [{ personId: other.id, templates }], {
          modelId,
          similarity: (first, second) => engine.similarity(new Float32Array(first), new Float32Array(second)),
        })[0];
        return match && match.similarity > (highest ?? -1) ? match.similarity : highest;
      }, undefined as number | undefined);
      if (best !== undefined) candidates.push({ personId: other.id, name: other.name, similarity: best });
    }
    return candidates.sort((first, second) => second.similarity - first.similarity);
  }

  async function saveSamples() {
    if (!profile || samplesRef.current.length < VISION_CONFIG.minimumEnrollmentSamples || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!duplicateCheckCompleted) {
        const candidates = await findDuplicates();
        setDuplicateCandidates(candidates);
        setDuplicateCheckCompleted(true);
        if (candidates.length > 0) return;
      }
      if (duplicateCandidates.length > 0 && !duplicateReviewed) return;
      const write = isReEnrollment ? services.replaceTemplates : services.saveTemplates;
      await write(profile.id, samplesRef.current.map((sample) => ({ ...sample, descriptor: new Float32Array(sample.descriptor) })));
      setCompletedSampleCount(samplesRef.current.length);
      samplesRef.current.forEach((sample) => sample.descriptor.fill(0));
      samplesRef.current = [];
      setSamples([]);
      const session = sessionRef.current;
      sessionRef.current = undefined;
      if (session?.active) services.camera.stopCamera(session);
      const engine = engineRef.current;
      engineRef.current = undefined;
      await engine?.dispose();
      setStage("complete");
      onComplete?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enrollment samples could not be saved. Retry or cancel.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelCapture() {
    const session = sessionRef.current;
    sessionRef.current = undefined;
    if (session?.active) services.camera.stopCamera(session);
    const engine = engineRef.current;
    engineRef.current = undefined;
    await engine?.dispose();
    samplesRef.current.forEach((sample) => sample.descriptor.fill(0));
    samplesRef.current = [];
    setSamples([]);
    setQualityReport(undefined);
    setError("");
    setStage("ready");
    onCancel?.();
  }

  return (
    <section className="enrollment-flow" aria-labelledby="enrollment-flow-heading">
      <div className="page-heading">
        <p className="eyebrow">LOCAL PERSON ENROLLMENT</p>
        <h1 id="enrollment-flow-heading">{stage === "complete" ? "Enrollment complete" : "Enroll a Person"}</h1>
        <p className="muted-text">Camera frames are processed locally and discarded. Face descriptors and profile data stay in this browser's IndexedDB.</p>
      </div>

      {(stage === "review" || stage === "confirm_reenrollment") && (
        <section className="surface-card enrollment-review" aria-labelledby="profile-preview-heading">
          <p className="eyebrow">PROFILE PREVIEW · LOCAL ONLY</p>
          <h2 id="profile-preview-heading">{isReEnrollment ? "Review re-enrollment" : "Review profile before saving"}</h2>
          <dl className="profile-preview-grid">
            <div><dt>Name</dt><dd>{visibleName}</dd></div>
            <div><dt>Person ID</dt><dd>{existingProfile?.personId ?? payload?.personId}</dd></div>
            <div><dt>Role</dt><dd>{existingProfile?.role ?? payload?.role ?? "—"}</dd></div>
            <div><dt>Department</dt><dd>{existingProfile?.department ?? payload?.department ?? "—"}</dd></div>
            <div><dt>Organization</dt><dd>{existingProfile?.organization ?? payload?.organization ?? "—"}</dd></div>
            <div><dt>Email</dt><dd>{existingProfile?.email ?? payload?.email ?? "—"}</dd></div>
          </dl>
          <div className="privacy-notice" role="note">
            <strong>Biometric data is sensitive.</strong> Recognition runs locally. This app stores face descriptors on this device only, does not store camera frames, and does not provide authentication or liveness verification.
          </div>
          <label className="consent-control">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>{isReEnrollment ? "I confirm this person has renewed consent and approve replacing current face samples." : "I confirm this person has consented to local face enrollment and storage of face descriptors on this device."}</span>
          </label>
          {!isReEnrollment && (
            <div className="portrait-opt-in">
              <label className="consent-control">
                <input type="checkbox" checked={portraitEnabled} onChange={(event) => { setPortraitEnabled(event.target.checked); if (!event.target.checked) setPortraitBlob(undefined); }} />
                <span>Add an optional profile portrait to this local record. This is separate from face recognition samples.</span>
              </label>
              {portraitEnabled && (
                <label className="portrait-file-label">
                  Choose portrait (JPEG, PNG, or WebP; up to 5 MB)
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) { setPortraitBlob(undefined); return; }
                    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) {
                      setError("Choose a JPEG, PNG, or WebP portrait smaller than 5 MB.");
                      event.target.value = "";
                      setPortraitBlob(undefined);
                      return;
                    }
                    setError("");
                    setPortraitBlob(file.slice(0, file.size, file.type));
                  }} />
                </label>
              )}
            </div>
          )}
          {isReEnrollment ? (
            <button className="button-primary" type="button" disabled={!consent || busy} onClick={() => void confirmReEnrollment()}>
              Confirm re-enrollment
            </button>
          ) : (
            <button className="button-primary" type="button" disabled={!consent || busy || (portraitEnabled && !portraitBlob)} onClick={() => void saveProfileAndContinue()}>
              {busy ? "Saving profile…" : "Save profile and continue"}
            </button>
          )}
          <button className="button-secondary" type="button" onClick={onCancel}>Cancel</button>
        </section>
      )}

      {stage === "ready" && profile && (
        <section className="surface-card enrollment-ready" aria-labelledby="capture-start-heading">
          <p className="eyebrow">PROFILE SAVED · CAMERA OFF</p>
          <h2 id="capture-start-heading">Ready to capture {profile.name}</h2>
          <p>We will load the face and object models, then ask for camera permission. You control each sample capture.</p>
          {modelStatus.state === "loading" && <p role="status">{modelStatus.message} {Math.round(modelStatus.progress * 100)}%</p>}
          <button className="button-primary" type="button" disabled={busy} onClick={() => void startCapture()}>
            {busy ? "Preparing local models…" : "Start camera and capture samples"}
          </button>
          <button className="button-secondary" type="button" onClick={onCancel}>Cancel enrollment</button>
        </section>
      )}

      <SampleCapture
        active={stage === "capturing"}
        videoRef={videoRef}
        prompt={prompt}
        qualityReport={qualityReport}
        samples={samples}
        maxSamples={settings.maxEnrollmentSamples}
        minimumSamples={VISION_CONFIG.minimumEnrollmentSamples}
        cameraActive={Boolean(sessionRef.current?.active)}
        busy={busy}
        error={error}
        duplicateCandidates={duplicateCandidates}
        duplicateReviewed={duplicateReviewed}
        onCapture={() => void captureSample()}
        onCancel={() => void cancelCapture()}
        onSave={() => void saveSamples()}
        onDuplicateReviewed={setDuplicateReviewed}
      />

      {stage === "complete" && (
        <section className="surface-card enrollment-success" role="status">
          <p className="eyebrow">ENROLLMENT SAVED LOCALLY</p>
          <h2>{profile?.name} is ready for recognition</h2>
          <p>{completedSampleCount} quality-approved face descriptors are stored for this profile. Raw capture frames were discarded.</p>
          <button className="button-primary" type="button" onClick={onCancel}>Enroll another person</button>
        </section>
      )}

      {error && stage !== "capturing" && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
    </section>
  );
}
