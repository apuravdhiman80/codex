import { useEffect, useState, type RefObject } from "react";
import type { OverlaySettings } from "../../types/vision";
import type { FrameViewModel } from "./InferenceLoop";
import { drawDetectionOverlay } from "./DetectionOverlay";

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  frame?: FrameViewModel;
  overlays: OverlaySettings;
  cameraActive: boolean;
  busy: boolean;
  placeholder: string;
}

export function CameraStage({ videoRef, frame, overlays, cameraActive, busy, placeholder }: CameraStageProps) {
  const [aspectRatio, setAspectRatio] = useState("4 / 3");
  useEffect(() => {
    if (!cameraActive && !frame) return;
    const video = videoRef.current;
    const canvas = video?.nextElementSibling;
    if (!video || !(canvas instanceof HTMLCanvasElement)) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let request = 0;
    let active = true;
    const draw = () => {
      if (!active) return;
      const bounds = video.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawDetectionOverlay(context, bounds.width, bounds.height, frame, overlays);
      request = window.requestAnimationFrame ? window.requestAnimationFrame(draw) : window.setTimeout(draw, 33) as unknown as number;
    };
    draw();
    return () => {
      active = false;
      if (window.cancelAnimationFrame) window.cancelAnimationFrame(request);
      else window.clearTimeout(request);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [videoRef, frame, overlays, cameraActive]);

  return (
    <section className="camera-stage" aria-label="Live vision camera">
      <div className="camera-stage-frame" style={{ aspectRatio }}>
        <video ref={videoRef} className="camera-stage-video" muted playsInline autoPlay aria-label="Live camera preview" onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.videoWidth > 0 && video.videoHeight > 0) setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
        }} />
        <canvas className="camera-stage-overlay" aria-hidden="true" />
        {!cameraActive && <div className="camera-stage-placeholder"><span className="camera-stage-icon" aria-hidden="true">⌗</span><p>{placeholder}</p>{busy && <span role="status">Preparing local vision models…</span>}</div>}
        {cameraActive && <div className="camera-stage-live"><span className="status-dot status-dot-active" /> CAMERA ACTIVE · LOCAL PROCESSING</div>}
      </div>
      <p className="camera-stage-caption">Frames remain in browser memory. Detection boxes use model output; identity labels require enrolled descriptors.</p>
    </section>
  );
}
