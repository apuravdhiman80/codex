import type { RefObject } from "react";
import type { NewFaceTemplate } from "../../types/person";
import type { PosePrompt, QualityReport } from "../../ai/recognition/quality";
import { FaceQualityPanel } from "./FaceQualityPanel";

interface DuplicateCandidate {
  personId: string;
  name: string;
  similarity: number;
}

interface SampleCaptureProps {
  active: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  prompt: PosePrompt;
  qualityReport?: QualityReport;
  samples: NewFaceTemplate[];
  maxSamples: number;
  minimumSamples: number;
  cameraActive: boolean;
  busy: boolean;
  error: string;
  duplicateCandidates: DuplicateCandidate[];
  duplicateReviewed: boolean;
  onCapture(): void;
  onCancel(): void;
  onSave(): void;
  onDuplicateReviewed(checked: boolean): void;
}

export function SampleCapture({
  active,
  videoRef,
  prompt,
  qualityReport,
  samples,
  maxSamples,
  minimumSamples,
  cameraActive,
  busy,
  error,
  duplicateCandidates,
  duplicateReviewed,
  onCapture,
  onCancel,
  onSave,
  onDuplicateReviewed,
}: SampleCaptureProps) {
  return (
    <section className="capture-layout" aria-label="Face sample capture" hidden={!active}>
      <div className="camera-capture-card">
        <video ref={videoRef} className="enrollment-video" muted playsInline autoPlay aria-label="Live camera for face enrollment" />
        <div className="camera-capture-status"><span className="status-dot status-dot-active" /> CAMERA ACTIVE · PROCESSING ON THIS DEVICE</div>
        <FaceQualityPanel report={qualityReport} prompt={prompt} sampleCount={samples.length} />
        {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
        <div className="capture-actions">
          <button className="button-primary" type="button" disabled={busy || !cameraActive || samples.length >= maxSamples} onClick={onCapture}>
            {busy ? "Checking face quality…" : `Capture ${samples.length >= minimumSamples ? "optional " : ""}${prompt} sample`}
          </button>
          <button className="button-secondary" type="button" disabled={busy} onClick={onCancel}>Cancel enrollment</button>
        </div>
      </div>
      <aside className="surface-card sample-progress-card" aria-label="Enrollment sample progress">
        <p className="eyebrow">ENROLLMENT PROGRESS</p>
        <strong>{samples.length} / {maxSamples}</strong>
        <p>{minimumSamples} quality-approved samples are required. Capture front, left, and right angles.</p>
        <ul>{samples.map((sample, index) => <li key={`${sample.pose}-${index}`}>{sample.pose} sample · quality {Math.round(sample.quality * 100)}%</li>)}</ul>
        {samples.length >= minimumSamples && (
          <>
            {duplicateCandidates.length > 0 && !duplicateReviewed && (
              <div className="duplicate-review" role="alert">
                <strong>Possible duplicate profiles</strong>
                <ul>{duplicateCandidates.map((candidate) => <li key={candidate.personId}>{candidate.name} · similarity {Math.round(candidate.similarity * 100)}%</li>)}</ul>
                <label><input type="checkbox" checked={duplicateReviewed} onChange={(event) => onDuplicateReviewed(event.target.checked)} /> I reviewed these suggestions and still want to save this enrollment.</label>
              </div>
            )}
            <button className="button-primary" type="button" disabled={busy || (duplicateCandidates.length > 0 && !duplicateReviewed)} onClick={onSave}>
              {busy ? "Checking and saving…" : `Save ${samples.length} samples`}
            </button>
          </>
        )}
      </aside>
    </section>
  );
}
