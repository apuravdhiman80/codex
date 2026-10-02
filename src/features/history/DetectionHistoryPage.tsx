import { useEffect, useMemo, useState } from "react";
import { Activity, Download, FileJson, Filter, Trash2 } from "lucide-react";
import { queryEvents, deleteAllEvents } from "../../data/repositories/eventRepository";
import { listProfiles } from "../../data/repositories/peopleRepository";
import type { DetectionEvent } from "../../types/events";
import type { PersonProfile } from "../../types/person";
import { exportEventsCsv, exportEventsJson, exportPeopleJson, exportSessionReport } from "./eventExport";
import { filterEvents, type HistoryFilter } from "./historyFilters";
import { HistoryFilterControls } from "./HistoryFilterControls";

const emptyFilter: HistoryFilter = { search: "", kind: "all", demo: "all" };
const timeLabel = (timestamp: number) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(timestamp);

function downloadFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function EventDetail({ event }: { event: DetectionEvent }) {
  return (
    <details className="event-detail">
      <summary>View event details</summary>
      <dl>
        <div><dt>Event ID</dt><dd>{event.id}</dd></div>
        {event.personId && <div><dt>Person record</dt><dd>{event.personId}</dd></div>}
        {event.trackId && <div><dt>Temporary track</dt><dd>{event.trackId}</dd></div>}
        {event.boundingBox && <div><dt>Bounding box (normalized)</dt><dd>{[event.boundingBox.x, event.boundingBox.y, event.boundingBox.width, event.boundingBox.height].map((value) => value.toFixed(3)).join(" · ")}</dd></div>}
        {event.detectorConfidence !== undefined && <div><dt>Detection confidence</dt><dd>{(event.detectorConfidence * 100).toFixed(1)}%</dd></div>}
        {event.recognitionSimilarity !== undefined && <div><dt>Recognition similarity</dt><dd>{(event.recognitionSimilarity * 100).toFixed(1)}%</dd></div>}
        <div><dt>Mode</dt><dd>{event.mode}</dd></div>
      </dl>
    </details>
  );
}

export function DetectionHistoryPage() {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [people, setPeople] = useState<PersonProfile[]>([]);
  const [filter, setFilter] = useState(emptyFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visibleEvents = useMemo(() => filterEvents(events, filter), [events, filter]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [loadedEvents, loadedPeople] = await Promise.all([queryEvents({ limit: 1000 }), listProfiles()]);
      setEvents(loadedEvents);
      setPeople(loadedPeople);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Local detection history could not be read.");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    document.title = "Detection History | VisionID AI";
    void refresh();
  }, []);

  async function clearHistory() {
    if (!window.confirm("Delete all local detection history? Person profiles and face templates will be kept.")) return;
    try {
      await deleteAllEvents();
      setEvents([]);
      setNotice("Detection history was deleted from this browser.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "History could not be deleted."); }
  }

  return (
    <section className="ops-page" aria-labelledby="history-heading">
      <header className="ops-heading"><div><p className="eyebrow">LOCAL EVENT LOG</p><h1 id="history-heading">Detection History</h1><p>Review and export detections recorded in this browser. Face templates and camera frames are never included in exports.</p></div><div className="ops-heading-icon"><Activity size={24} /></div></header>
      {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
      {notice && <p className="inline-alert inline-alert-success" role="status">{notice}</p>}
      <section className="ops-panel" aria-labelledby="history-filter-heading">
        <div className="ops-panel-heading"><div><p className="eyebrow">EVENT QUERY</p><h2 id="history-filter-heading"><Filter size={17} /> Filter history</h2></div><span className="ops-count">{visibleEvents.length} shown</span></div>
        <HistoryFilterControls value={filter} onChange={setFilter} />
        <div className="ops-toolbar">
          <div className="ops-actions">
            <button className="button-secondary" type="button" disabled={!visibleEvents.length} onClick={() => downloadFile("visionid-events.csv", exportEventsCsv(visibleEvents), "text/csv;charset=utf-8")}><Download size={15} /> Export CSV</button>
            <button className="button-secondary" type="button" disabled={!visibleEvents.length} onClick={() => downloadFile("visionid-events.json", exportEventsJson(visibleEvents), "application/json;charset=utf-8")}><FileJson size={15} /> Export events JSON</button>
            <button className="button-secondary" type="button" disabled={!visibleEvents.length} onClick={() => downloadFile("visionid-session-report.json", JSON.stringify(exportSessionReport(visibleEvents, { from: filter.from, to: filter.to }), null, 2), "application/json;charset=utf-8")}><FileJson size={15} /> Export summary</button>
            <button className="button-secondary" type="button" disabled={!people.length} onClick={() => downloadFile("visionid-people.json", exportPeopleJson(people), "application/json;charset=utf-8")}><FileJson size={15} /> Export directory</button>
          </div>
          <button className="button-danger" type="button" disabled={!events.length} onClick={() => void clearHistory()}><Trash2 size={15} /> Clear history</button>
        </div>
        <p className="ops-help">Exports include event labels, timestamps, separate confidence fields, and normalized boxes. Profile exports omit portraits; neither export contains biometric templates.</p>
      </section>
      <section className="ops-panel" aria-labelledby="events-heading">
        <div className="ops-panel-heading"><div><p className="eyebrow">MOST RECENT FIRST</p><h2 id="events-heading">Detection events</h2></div><span className="ops-count">{events.length === 1000 ? "Latest 1,000" : `${events.length} total`}</span></div>
        {loading ? <p className="ops-empty" role="status">Loading local history…</p> : !visibleEvents.length ? <div className="ops-empty"><strong>No matching detections</strong><span>Change the filters or start the camera to record new events.</span></div> : <ol className="history-event-list">{visibleEvents.map((event) => <li key={event.id} className="history-event">
          <span className={`event-kind-mark event-kind-${event.type}`} aria-hidden="true" />
          <div className="history-event-main"><div className="history-event-title"><strong>{event.label}</strong><span className="history-type-label">{event.type.replaceAll("_", " ")}</span>{event.isDemo && <span className="demo-pill">DEMO DATA</span>}</div><time dateTime={new Date(event.timestamp).toISOString()}>{timeLabel(event.timestamp)}</time><EventDetail event={event} /></div>
          <div className="history-event-scores">{event.detectorConfidence !== undefined && <span>Detector <b>{(event.detectorConfidence * 100).toFixed(1)}%</b></span>}{event.recognitionSimilarity !== undefined && <span>Similarity <b>{(event.recognitionSimilarity * 100).toFixed(1)}%</b></span>}</div>
        </li>)}</ol>}
      </section>
    </section>
  );
}
