import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Activity, ArrowUpRight, ScanFace, ShieldCheck, Timer, UsersRound } from "lucide-react";
import { Link } from "react-router";
import { queryEvents } from "../../data/repositories/eventRepository";
import type { DetectionEvent } from "../../types/events";
import { getSessionMetrics, subscribeSessionMetrics } from "../vision/sessionMetrics";
import { summarizeEvents } from "./analytics";

interface AnalyticsPanelProps { loadEvents?: () => Promise<DetectionEvent[]> }
const loadLocalEvents = () => queryEvents({ limit: 1000 });

function ScoreMeter({ label, value, color }: { label: string; value: number | null; color: "mint" | "blue" }) {
  const percent = value === null ? 0 : Math.round(value * 100);
  return <div className="score-meter"><div><span>{label}</span><b>{value === null ? "—" : `${percent}%`}</b></div><div className="score-meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span className={`score-meter-fill score-meter-${color}`} style={{ width: `${percent}%` }} /></div></div>;
}

export function AnalyticsPanel({ loadEvents = loadLocalEvents }: AnalyticsPanelProps) {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [error, setError] = useState("");
  const metrics = useSyncExternalStore(subscribeSessionMetrics, getSessionMetrics, getSessionMetrics);
  useEffect(() => {
    let active = true;
    void loadEvents().then((rows) => { if (active) setEvents(rows); }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Analytics could not be loaded from local history.");
    });
    return () => { active = false; };
  }, [loadEvents]);
  const summary = useMemo(() => summarizeEvents(events), [events]);
  const maxObject = Math.max(1, ...summary.objectDistribution.map((item) => item.count));
  const maxTimeline = Math.max(1, ...summary.timeline.map((item) => item.count));
  const recent = [...events].sort((first, second) => second.timestamp - first.timestamp).slice(0, 5);

  return (
    <section className="ops-page analytics-page" aria-labelledby="analytics-heading">
      <header className="ops-heading"><div><p className="eyebrow">LIVE VISION DASHBOARD</p><h1 id="analytics-heading">Vision Overview</h1><p>Local detection activity, recognition outcomes, and measured session performance.</p></div><div className="engine-state-pill"><span className={`status-dot ${metrics.cameraActive ? "status-dot-active" : ""}`} />{metrics.cameraActive ? "CAMERA ACTIVE" : "CAMERA OFF"}</div></header>
      {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
      {summary.demoEvents > 0 && <div className="demo-banner"><span className="demo-pill">DEMO DATA</span><span>{summary.demoEvents} seeded events are included in these summaries. They are fictional samples, not live detections.</span></div>}
      <div className="analytics-stat-grid">
        <article className="analytics-stat"><span><UsersRound size={15} /> Faces detected</span><strong>{summary.facesDetected}</strong><small>{summary.recognizedEvents} recognized events · {summary.unknownFaces} unknown</small></article>
        <article className="analytics-stat"><span><ShieldCheck size={15} /> Recognized identities</span><strong>{summary.recognizedPeople}</strong><small>Unique enrolled records seen in history</small></article>
        <article className="analytics-stat"><span><Activity size={15} /> Objects detected</span><strong>{summary.objectsDetected}</strong><small>Recorded object events</small></article>
        <article className="analytics-stat"><span><ScanFace size={15} /> Measured FPS</span><strong>{metrics.measuredFps === null ? "—" : metrics.measuredFps.toFixed(1)}</strong><small>{metrics.capturedAt ? `${metrics.cameraActive ? "Latest frame" : "Last session"} ${new Date(metrics.capturedAt).toLocaleTimeString()}` : "Start a camera session to measure"}</small></article>
        <article className="analytics-stat"><span><Timer size={15} /> Inference latency</span><strong>{metrics.inferenceLatencyMs === null ? "—" : `${metrics.inferenceLatencyMs.toFixed(0)} ms`}</strong><small>Detector and face model execution</small></article>
        <article className="analytics-stat"><span><Timer size={15} /> End-to-end latency</span><strong>{metrics.totalLatencyMs === null ? "—" : `${metrics.totalLatencyMs.toFixed(0)} ms`}</strong><small>Measured frame processing time</small></article>
      </div>
      <div className="analytics-grid">
        <section className="ops-panel" aria-labelledby="confidence-heading"><div className="ops-panel-heading"><div><p className="eyebrow">SEPARATE MEASURES</p><h2 id="confidence-heading">Confidence signals</h2></div></div>
          <p className="ops-help">Detector confidence measures whether a face/object was found. Recognition similarity measures how closely a face matches an enrolled descriptor. They are not interchangeable.</p>
          <ScoreMeter label="Average detector confidence" value={summary.averageDetectorConfidence} color="mint" /><ScoreMeter label="Average recognition similarity" value={summary.averageRecognitionSimilarity} color="blue" />
        </section>
        <section className="ops-panel" aria-labelledby="object-distribution-heading"><div className="ops-panel-heading"><div><p className="eyebrow">RECORDED CLASS COUNTS</p><h2 id="object-distribution-heading">Object distribution</h2></div><Link to="/history" className="small-text-link">History <ArrowUpRight size={13} /></Link></div>
          {summary.objectDistribution.length ? <ul className="analytics-bars">{summary.objectDistribution.slice(0, 6).map((item) => <li key={item.label}><div><span>{item.label}</span><b>{item.count}</b></div><span className="analytics-bar-track"><i style={{ width: `${Math.max(5, (item.count / maxObject) * 100)}%` }} /></span></li>)}</ul> : <p className="ops-empty">No object events recorded yet.</p>}
        </section>
        <section className="ops-panel" aria-labelledby="timeline-heading"><div className="ops-panel-heading"><div><p className="eyebrow">LOCAL EVENT TIMELINE</p><h2 id="timeline-heading">Recent activity by minute</h2></div></div>
          {summary.timeline.length ? <ul className="timeline-bars">{summary.timeline.slice(-8).map((item, index) => <li key={`${item.time}-${index}`}><i style={{ height: `${Math.max(8, (item.count / maxTimeline) * 100)}%` }} title={`${item.count} events`} /><span>{item.time}</span></li>)}</ul> : <p className="ops-empty">New detection events will appear here.</p>}
        </section>
        <section className="ops-panel" aria-labelledby="recent-heading"><div className="ops-panel-heading"><div><p className="eyebrow">LOCAL HISTORY</p><h2 id="recent-heading">Recent detections</h2></div><Link to="/history" className="small-text-link">View all <ArrowUpRight size={13} /></Link></div>
          {recent.length ? <ol className="analytics-recent-list">{recent.map((event) => <li key={event.id}><span className={`event-kind-mark event-kind-${event.type}`} /><div><strong>{event.label}</strong><span>{event.type.replaceAll("_", " ")}{event.isDemo ? " · Demo" : ""}</span></div><time>{new Date(event.timestamp).toLocaleTimeString()}</time></li>)}</ol> : <p className="ops-empty">No detections yet. Start local vision when you are ready.</p>}
        </section>
      </div>
      <p className="analytics-privacy">Camera activity is local to this browser. Analytics are computed from local event records; clear or export them in <Link to="/history">Detection History</Link>.</p>
    </section>
  );
}
