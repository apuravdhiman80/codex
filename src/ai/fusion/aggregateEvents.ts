import type { DetectionEvent, NewDetectionEvent } from "../../types/events";
import { VISION_CONFIG } from "../../config/vision";

export const DEFAULT_EVENT_DEDUPE_WINDOW_MS = VISION_CONFIG.eventDedupeWindowMs;

function eventKey(event: Pick<DetectionEvent, "type" | "label" | "personId" | "trackId">): string {
  const identity = event.personId ?? event.trackId ?? event.label.trim().toLowerCase();
  return `${event.type}:${identity}`;
}

/** Keeps new live event writes sparse while preserving separate detector and recognition metrics. */
export function aggregateEvents(
  recentEvents: readonly (DetectionEvent | NewDetectionEvent)[],
  incomingEvents: readonly NewDetectionEvent[],
  dedupeWindowMs = DEFAULT_EVENT_DEDUPE_WINDOW_MS,
): NewDetectionEvent[] {
  if (!Number.isFinite(dedupeWindowMs) || dedupeWindowMs < 0) return [...incomingEvents];
  const recentByKey = new Map<string, number>();
  for (const event of recentEvents) {
    const key = eventKey(event);
    const current = recentByKey.get(key);
    if (current === undefined || event.timestamp > current) recentByKey.set(key, event.timestamp);
  }
  const accepted: NewDetectionEvent[] = [];
  for (const event of incomingEvents) {
    const key = eventKey(event);
    const previousTime = recentByKey.get(key);
    if (previousTime !== undefined && Math.abs(event.timestamp - previousTime) < dedupeWindowMs) continue;
    accepted.push(event);
    recentByKey.set(key, event.timestamp);
  }
  return accepted;
}
