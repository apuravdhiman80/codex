import type { FrameViewModel } from "./InferenceLoop";

interface MetricsBarProps {
  frame?: FrameViewModel;
  cameraActive: boolean;
}

export function MetricsBar({ frame, cameraActive }: MetricsBarProps) {
  const recognized = frame?.faces.filter((item) => item.decision.status === "recognized").length ?? 0;
  const unknown = frame?.faces.filter((item) => item.decision.status !== "recognized").length ?? 0;
  const averageDetector = frame && (frame.faces.length + frame.objects.length) > 0
    ? [...frame.faces.map((item) => item.face.detectorConfidence), ...frame.objects.map((item) => item.detectorConfidence)]
        .reduce((sum, confidence) => sum + confidence, 0) / (frame.faces.length + frame.objects.length)
    : undefined;
  return (
    <section className="vision-metrics" aria-label="Live vision statistics">
      <article><span>FACES</span><strong>{frame?.faces.length ?? 0}</strong></article>
      <article><span>PERSON OBJECTS</span><strong>{frame?.objects.filter((item) => item.className === "person").length ?? 0}</strong></article>
      <article><span>RECOGNIZED</span><strong>{recognized}</strong></article>
      <article><span>UNKNOWN</span><strong>{unknown}</strong></article>
      <article><span>OBJECTS</span><strong>{frame?.objects.length ?? 0}</strong></article>
      <article><span>AVG DETECTOR</span><strong>{averageDetector === undefined ? "—" : `${Math.round(averageDetector * 100)}%`}</strong></article>
      <article><span>MEASURED FPS</span><strong>{frame?.measuredFps ? frame.measuredFps.toFixed(1) : "—"}</strong></article>
      <article><span>INFERENCE</span><strong>{frame ? `${Math.round(frame.inferenceLatencyMs)} ms` : "—"}</strong></article>
      <article><span>END TO END</span><strong>{frame ? `${Math.round(frame.totalLatencyMs)} ms` : "—"}</strong></article>
      <article><span>CAMERA</span><strong className={cameraActive ? "metric-active" : ""}>{cameraActive ? "ACTIVE" : "OFF"}</strong></article>
    </section>
  );
}
