import type { HistoryFilter, HistoryKind, DemoFilter } from "./historyFilters";

interface HistoryFiltersProps {
  value: HistoryFilter;
  onChange(value: HistoryFilter): void;
}

function localDateInput(timestamp?: number): string {
  if (timestamp === undefined) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localBoundary(value: string, end: boolean): number | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0).getTime();
}

export function HistoryFilterControls({ value, onChange }: HistoryFiltersProps) {
  function update<K extends keyof HistoryFilter>(key: K, next: HistoryFilter[K]) {
    onChange({ ...value, [key]: next });
  }
  return (
    <div className="history-filter-grid" aria-label="Filter detection history">
      <label className="ops-field history-search">Search detections
        <input type="search" value={value.search} onChange={(event) => update("search", event.target.value)} placeholder="Person, object, or track ID" />
      </label>
      <label className="ops-field">Type
        <select value={value.kind} onChange={(event) => update("kind", event.target.value as HistoryKind)}>
          <option value="all">All detections</option><option value="people">People only</option><option value="objects">Objects only</option>
        </select>
      </label>
      <label className="ops-field">Data source
        <select value={value.demo} onChange={(event) => update("demo", event.target.value as DemoFilter)}>
          <option value="all">All data</option><option value="live">Live detections</option><option value="demo">Demo data only</option>
        </select>
      </label>
      <label className="ops-field">From date
        <input type="date" value={localDateInput(value.from)} onChange={(event) => update("from", localBoundary(event.target.value, false))} />
      </label>
      <label className="ops-field">To date
        <input type="date" value={localDateInput(value.to)} onChange={(event) => update("to", localBoundary(event.target.value, true))} />
      </label>
    </div>
  );
}

