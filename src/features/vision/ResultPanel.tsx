import type { FrameViewModel, TrackedFaceResult } from "./InferenceLoop";
import { ObjectDetailsPanel } from "../objects/ObjectDetailsPanel";

function FaceResultCard({ item }: { item: TrackedFaceResult }) {
  if (item.decision.status === "recognized" && item.profile) {
    return (
      <article className="face-result-card face-result-recognized">
        <div className="face-result-icon" aria-hidden="true">✓</div>
        <div className="face-result-content">
          <div className="face-result-title"><strong>{item.profile.name}</strong><span>RECOGNIZED</span></div>
          <p>{item.profile.personId} · {item.profile.role || "Enrolled person"}{item.profile.department ? ` · ${item.profile.department}` : ""}</p>
          <dl><div><dt>Identity similarity</dt><dd>{Math.round(item.decision.similarity * 100)}%</dd></div><div><dt>Face detector</dt><dd>{Math.round(item.face.detectorConfidence * 100)}%</dd></div><div><dt>Tracking ID</dt><dd>{item.trackId || "—"}</dd></div></dl>
        </div>
      </article>
    );
  }
  const label = item.decision.status === "ambiguous" ? "Ambiguous match" : "Unknown person";
  return (
    <article className="face-result-card face-result-unknown">
      <div className="face-result-icon" aria-hidden="true">?</div>
      <div className="face-result-content">
        <div className="face-result-title"><strong>{label}</strong><span>{item.decision.status === "ambiguous" ? "AMBIGUOUS" : "UNKNOWN"}</span></div>
        <p>Face detected · detector confidence {Math.round(item.face.detectorConfidence * 100)}%. No enrolled identity is assigned.</p>
      </div>
    </article>
  );
}

interface ResultPanelProps {
  frame?: FrameViewModel;
  objectOnly?: boolean;
}

export function ResultPanel({ frame, objectOnly = false }: ResultPanelProps) {
  const faces = objectOnly ? [] : frame?.faces ?? [];
  const objects = frame?.objects ?? [];
  const hasResults = faces.length > 0 || objects.length > 0;
  return (
    <div className="result-stack">
      {!objectOnly && (
        <section className="vision-panel face-results-panel" aria-labelledby="people-results-heading">
          <div className="panel-heading"><div><p className="eyebrow">PERSON RECOGNITION</p><h2 id="people-results-heading">Faces and identities</h2></div><span className="count-badge">{faces.length}</span></div>
          {faces.length ? <div className="face-result-list">{faces.map((item, index) => <FaceResultCard key={`${item.trackId}-${index}`} item={item} />)}</div> : <p className="panel-empty">{frame ? "No current detections." : "Start vision to see live detections."}</p>}
        </section>
      )}
      {objectOnly || objects.length > 0 ? <ObjectDetailsPanel objects={objects} /> : null}
      {frame?.warnings.map((warning, index) => <p className="inline-alert inline-alert-error" role="alert" key={`${warning}-${index}`}>{warning}</p>)}
      {!hasResults && frame?.eventDelta.length ? <p className="panel-empty">No new detection events were added.</p> : null}
    </div>
  );
}
