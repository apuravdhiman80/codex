import type { QualityReport, PosePrompt } from "../../ai/recognition/quality";

interface FaceQualityPanelProps {
  report?: QualityReport;
  prompt: PosePrompt;
  sampleCount: number;
}

export function FaceQualityPanel({ report, prompt, sampleCount }: FaceQualityPanelProps) {
  const instruction = prompt === "front" ? "Look straight at the camera" : `Turn your face slightly to your ${prompt}`;
  return (
    <section className="face-quality-panel" aria-labelledby="face-quality-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">GUIDED ENROLLMENT · SAMPLE {Math.min(sampleCount + 1, 5)} OF 5</p>
          <h3 id="face-quality-heading">{instruction}</h3>
        </div>
        <span className={`quality-readiness ${report?.ready ? "quality-ready" : ""}`}>
          {report?.ready ? "READY" : report ? "RETRY" : "WAITING"}
        </span>
      </div>
      <p className="muted-text">Quality checks are guidance only. They do not verify liveness or prevent spoofing.</p>
      {report && (
        <>
          <ul className="quality-check-list">
            {report.checks.map((check) => (
              <li key={check.key} className={check.passed ? "quality-check-passed" : "quality-check-failed"}>
                <span aria-hidden="true">{check.passed ? "✓" : "○"}</span>
                <span>{check.label}</span>
                <span>{check.passed ? "Good" : "Needs attention"}</span>
              </li>
            ))}
          </ul>
          {report.guidance.length > 0 && <p className="quality-guidance" role="status">{report.guidance.join(" ")}</p>}
        </>
      )}
    </section>
  );
}
