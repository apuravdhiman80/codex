import type { DetectionEvent } from "../../types/events";

export type HistoryKind = "all" | "people" | "objects";
export type DemoFilter = "all" | "demo" | "live";
export interface HistoryFilter {
  search: string;
  kind: HistoryKind;
  demo: DemoFilter;
  from?: number;
  to?: number;
}

export function filterEvents(events: readonly DetectionEvent[], filter: HistoryFilter): DetectionEvent[] {
  const search = filter.search.trim().toLocaleLowerCase();
  return events.filter((event) => {
    if (search && !`${event.label} ${event.personId ?? ""} ${event.trackId ?? ""}`.toLocaleLowerCase().includes(search)) return false;
    if (filter.kind === "people" && event.type === "object_detected") return false;
    if (filter.kind === "objects" && event.type !== "object_detected") return false;
    if (filter.demo === "demo" && !event.isDemo) return false;
    if (filter.demo === "live" && event.isDemo) return false;
    if (filter.from !== undefined && event.timestamp < filter.from) return false;
    if (filter.to !== undefined && event.timestamp > filter.to) return false;
    return true;
  });
}
