import type { TrackedObjectResult } from "../vision/InferenceLoop";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface ObjectDetailsPanelProps {
  objects: TrackedObjectResult[];
}

export function ObjectDetailsPanel({ objects }: ObjectDetailsPanelProps) {
  return (
    <section className="vision-panel object-details-panel" aria-labelledby="object-details-heading">
      <div className="panel-heading"><div><p className="eyebrow">LIVE OBJECTS</p><h2 id="object-details-heading">Object details</h2></div><span className="count-badge">{objects.length}</span></div>
      {objects.length === 0 ? <p className="panel-empty">No object detections in the current frame.</p> : (
        <ul className="object-detail-list">
          {objects.map((object, index) => (
            <li key={`${object.trackId}-${index}`}>
              <div className="object-detail-title"><strong>{object.className}</strong><span>{Math.round(object.detectorConfidence * 100)}% detector</span></div>
              <dl>
                <div><dt>Bounding box</dt><dd>x {object.box.x.toFixed(3)} · y {object.box.y.toFixed(3)} · w {object.box.width.toFixed(3)} · h {object.box.height.toFixed(3)}</dd></div>
                <div><dt>Tracking ID</dt><dd>{object.trackId || "—"}</dd></div>
                <div><dt>First seen</dt><dd>{formatTime(object.firstSeenAt)}</dd></div>
                <div><dt>Last seen</dt><dd>{formatTime(object.lastSeenAt)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
