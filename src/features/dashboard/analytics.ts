import type { DetectionEvent } from "../../types/events";
import { exportSessionReport } from "../history/eventExport";

export function summarizeEvents(events: readonly DetectionEvent[]) {
  const report = exportSessionReport(events);
  const objects = new Map<string, number>();
  for (const event of events) if (event.type === "object_detected") objects.set(event.label, (objects.get(event.label) ?? 0) + 1);
  const timeline = new Map<number, number>();
  for (const event of events) {
    const minute = Math.floor(event.timestamp / 60_000) * 60_000;
    timeline.set(minute, (timeline.get(minute) ?? 0) + 1);
  }
  return {
    ...report,
    objectDistribution: [...objects.entries()].map(([label, count]) => ({ label, count })).sort((first, second) => second.count - first.count),
    timeline: [...timeline.entries()].sort(([first], [second]) => first - second).map(([timestamp, count]) => ({
      time: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(timestamp), count,
    })),
  };
}
