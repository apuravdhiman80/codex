export interface SessionMetricsSnapshot {
  cameraActive: boolean;
  measuredFps: number | null;
  inferenceLatencyMs: number | null;
  totalLatencyMs: number | null;
  capturedAt: number | null;
}

const empty: SessionMetricsSnapshot = { cameraActive: false, measuredFps: null, inferenceLatencyMs: null, totalLatencyMs: null, capturedAt: null };
let snapshot = empty;
const listeners = new Set<() => void>();

export function getSessionMetrics(): SessionMetricsSnapshot { return snapshot; }
export function subscribeSessionMetrics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function publishSessionMetrics(next: Partial<SessionMetricsSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}
