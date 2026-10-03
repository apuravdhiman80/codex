import type { BoundingBox, OverlaySettings } from "../../types/vision";
import type { FrameViewModel } from "./InferenceLoop";

export interface CanvasBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function scaleBoxToCanvas(box: BoundingBox, width: number, height: number): CanvasBox {
  return {
    x: box.x * width,
    y: box.y * height,
    width: box.width * width,
    height: box.height * height,
  };
}

function paintBox(
  context: CanvasRenderingContext2D,
  box: BoundingBox,
  width: number,
  height: number,
  color: string,
  label: string,
): void {
  const scaled = scaleBoxToCanvas(box, width, height);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(scaled.x, scaled.y, scaled.width, scaled.height);
  context.font = "600 11px Inter, system-ui, sans-serif";
  const textWidth = context.measureText(label).width;
  const labelHeight = 21;
  const labelY = Math.max(0, scaled.y - labelHeight);
  context.fillStyle = color;
  context.fillRect(scaled.x, labelY, textWidth + 14, labelHeight);
  context.fillStyle = "#06121c";
  context.fillText(label, scaled.x + 7, labelY + 14);
}

export function drawDetectionOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: FrameViewModel | undefined,
  overlays: OverlaySettings,
): void {
  context.clearRect(0, 0, width, height);
  if (!frame) return;
  if (overlays.faces) {
    for (const { face, decision, profile, trackId, associatedPersonTrackId } of frame.faces) {
      const personTrackLabel = associatedPersonTrackId ? ` · Person #${associatedPersonTrackId}` : "";
      const label = decision.status === "recognized" && profile
        ? `${profile.name} · Match ${Math.round(decision.similarity * 100)}% · Face ${Math.round(face.detectorConfidence * 100)}% · #${trackId || "?"}${personTrackLabel}`
        : `Unknown · Face ${Math.round(face.detectorConfidence * 100)}% · #${trackId || "?"}${personTrackLabel}`;
      paintBox(context, face.box, width, height, decision.status === "recognized" ? "#44d5cb" : "#f2bd63", label);
      if (overlays.landmarks && face.landmarks?.length) {
        context.fillStyle = "rgba(255, 255, 255, 0.72)";
        for (const landmark of face.landmarks) {
          const x = landmark.x * width;
          const y = landmark.y * height;
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          context.beginPath();
          context.arc(x, y, 1.1, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }
  if (overlays.objects) {
    for (const object of frame.objects) {
      paintBox(context, object.box, width, height, "#79a7ff", `${object.className} · ${Math.round(object.detectorConfidence * 100)}% · #${object.trackId || "?"}`);
    }
  }
}
