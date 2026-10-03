import type { FrameViewModel } from "./InferenceLoop";

interface MetricsBarProps {
  frame?: FrameViewModel;
  cameraActive: boolean;
}

export function MetricsBar({ frame, cameraActive }: MetricsBarProps) {
  const averageDetector = frame?.objects.length
    ? frame.objects.reduce((sum, object) => sum + object.detectorConfidence, 0) / frame.objects.length
    : undefined;
  return (
    <section className="vision-metrics" aria-label="Live vision statistics">
      <article><span>OBJECTS</span><strong>{frame?.objects.length ?? 0}</strong></article>
      <article><span>AVG DETECTOR</span><strong>{averageDetector === undefined ? "—" : `${Math.round(averageDetector * 100)}%`}</strong></article>
      <article><span>MEASURED FPS</span><strong>{frame?.measuredFps ? frame.measuredFps.toFixed(1) : "—"}</strong></article>
      <article><span>INFERENCE</span><strong>{frame ? `${Math.round(frame.inferenceLatencyMs)} ms` : "—"}</strong></article>
      <article><span>END TO END</span><strong>{frame ? `${Math.round(frame.totalLatencyMs)} ms` : "—"}</strong></article>
      <article><span>CAMERA</span><strong className={cameraActive ? "metric-active" : ""}>{cameraActive ? "ACTIVE" : "OFF"}</strong></article>
    </section>
  );
}
