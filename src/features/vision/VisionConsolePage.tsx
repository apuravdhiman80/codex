import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import { loadVisionEngine } from "../../ai/engine/modelLoader";
import type { ModelStatus, VisionEngine } from "../../ai/engine/types";
import type { CameraSession, CameraStatus } from "../camera/cameraService";
import type { CameraFacingMode, VisionMode, VisionSettings } from "../../types/vision";
import type { FrameViewModel } from "./InferenceLoop";
import { InferenceLoop, type InferenceLoopDependencies } from "./InferenceLoop";
import { CameraStage } from "./CameraStage";
import { MetricsBar } from "./MetricsBar";
import { ResultPanel } from "./ResultPanel";
import { VisionControls } from "./VisionControls";
import { resolveVisionConsoleServices, type VisionConsoleServices } from "./visionServices";
import { publishSessionMetrics } from "./sessionMetrics";

interface VisionConsolePageProps {
  mode?: VisionMode;
  services?: Partial<VisionConsoleServices>;
}

function cameraStatusText(status: CameraStatus): string {
  switch (status.state) {
    case "active": return "Camera active";
    case "requesting": return "Requesting camera permission";
    case "denied": return "Camera permission denied";
    case "unavailable": return "Camera unavailable";
    case "disconnected": return "Camera disconnected";
    default: return "Camera off";
  }
}

export function VisionConsolePage({ mode: fixedMode, services: serviceOverrides }: VisionConsolePageProps) {
  const services = useMemo(() => resolveVisionConsoleServices(serviceOverrides), [serviceOverrides]);
  const [engine] = useState<VisionEngine>(() => services.createEngine(DEFAULT_VISION_SETTINGS));
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | undefined>(undefined);
  const loopRef = useRef<InferenceLoop | undefined>(undefined);
  const initializedRef = useRef(false);
  const [settings, setSettings] = useState<VisionSettings>(DEFAULT_VISION_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [mode, setMode] = useState<VisionMode>(fixedMode ?? "fusion");
  const [facingMode, setFacingMode] = useState<CameraFacingMode>(DEFAULT_VISION_SETTINGS.cameraFacingMode);
  const [cameraId, setCameraId] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>(() => services.camera.status?.() ?? { state: "idle", message: "Camera is off." });
  const [engineStatus, setEngineStatus] = useState<ModelStatus>(() => engine.status());
  const [frame, setFrame] = useState<FrameViewModel>();
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isObjectOnly = mode === "objects";

  useEffect(() => {
    let active = true;
    void services.getSettings().then((loaded) => {
      if (!active) return;
      setSettings(loaded);
      setFacingMode(loaded.cameraFacingMode);
      setCameraId(loaded.cameraId ?? "");
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Saved vision settings could not be loaded. Defaults are active.");
    }).finally(() => { if (active) setSettingsReady(true); });
    return () => { active = false; };
  }, [services]);

  useEffect(() => {
    const unsubscribe = services.camera.subscribeToCameraStatus((status) => {
      setCameraStatus(status);
      if (status.state === "disconnected") {
        const loop = loopRef.current;
        loopRef.current = undefined;
        setFrame(undefined);
        if (loop) void loop.stop();
      }
    });
    void services.camera.enumerateCameras().then(setCameras);
    return unsubscribe;
  }, [services]);

  useEffect(() => {
    const unsubscribe = engine.subscribeStatus?.(setEngineStatus);
    return () => unsubscribe?.();
  }, [engine]);

  useEffect(() => () => {
    const loop = loopRef.current;
    loopRef.current = undefined;
    const session = sessionRef.current;
    sessionRef.current = undefined;
    if (loop) void loop.stop();
    if (session?.active) services.camera.stopCamera(session);
    void engine.dispose();
  }, [engine, services]);

  async function startVision() {
    if (busy || running) return;
    setBusy(true);
    setError("");
    setFrame(undefined);
    try {
      if (!settingsReady) await services.getSettings().then(setSettings);
      if (!videoRef.current) throw new Error("Camera preview is not ready. Retry after this page finishes loading.");
      if (!initializedRef.current) {
        await loadVisionEngine(engine, setEngineStatus);
        initializedRef.current = true;
        setEngineStatus(engine.status());
      }
      await engine.configure(settings);
      const session = await services.camera.startCamera(videoRef.current, cameraId
        ? { deviceId: cameraId, width: settings.maxInputWidth, height: settings.maxInputHeight }
        : { facingMode, width: settings.maxInputWidth, height: settings.maxInputHeight });
      sessionRef.current = session;
      void services.camera.enumerateCameras().then(setCameras);
      publishSessionMetrics({ cameraActive: true, measuredFps: null, inferenceLatencyMs: null, totalLatencyMs: null, capturedAt: null });
      const loopDependencies: InferenceLoopDependencies = {
        video: videoRef.current,
        engine,
        settings,
        mode,
        onFrame: (nextFrame) => {
          setFrame(nextFrame);
          publishSessionMetrics({ measuredFps: nextFrame.measuredFps || null, inferenceLatencyMs: nextFrame.inferenceLatencyMs, totalLatencyMs: nextFrame.totalLatencyMs, capturedAt: nextFrame.capturedAt, cameraActive: true });
        },
        onStop: () => {
          const current = sessionRef.current;
          sessionRef.current = undefined;
          if (current?.active) services.camera.stopCamera(current);
          publishSessionMetrics({ cameraActive: false });
          setRunning(false);
        },
        listProfiles: services.listProfiles,
        listTemplatesForPerson: services.listTemplatesForPerson,
        queryEvents: services.queryEvents,
        addEvents: services.addEvents,
        updateProfile: services.updateProfile,
      };
      const loop = new InferenceLoop(loopDependencies);
      loopRef.current = loop;
      setRunning(true);
      publishSessionMetrics({ cameraActive: true });
      setCameraStatus(services.camera.status?.() ?? { state: "active", message: "Camera is active locally.", deviceId: session.deviceId });
      loop.start();
    } catch (cause) {
      const current = sessionRef.current;
      sessionRef.current = undefined;
      if (current?.active) services.camera.stopCamera(current);
      setRunning(false);
      setCameraStatus(services.camera.status?.() ?? { state: "idle", message: "Camera is off." });
      setError(cause instanceof Error ? cause.message : "Vision could not start. Check camera permission and model availability.");
      setEngineStatus(engine.status());
    } finally {
      setBusy(false);
    }
  }

  async function stopVision() {
    const loop = loopRef.current;
    loopRef.current = undefined;
    if (loop) await loop.stop();
    const session = sessionRef.current;
    sessionRef.current = undefined;
    if (session?.active) services.camera.stopCamera(session);
    setRunning(false);
    publishSessionMetrics({ cameraActive: false });
    setFrame(undefined);
    setCameraStatus(services.camera.status?.() ?? { state: "idle", message: "Camera is off." });
  }

  const pageTitle = isObjectOnly ? "Object Detection Console" : "Vision Fusion Console";
  const statusLabel = engineStatus.state === "ready" ? "AI ENGINE READY" : engineStatus.state === "loading" ? "AI INITIALIZING" : engineStatus.state === "error" ? "AI ERROR" : "AI STANDBY";

  return (
    <section className="vision-console-page" aria-labelledby="vision-console-heading">
      <header className="vision-console-heading">
        <div><p className="eyebrow">LOCAL COMPUTER VISION · {isObjectOnly ? "OBJECT DETECTION" : "VISION FUSION"}</p><h1 id="vision-console-heading">{pageTitle}</h1><p>{isObjectOnly ? "Object-only mode runs the real local detector and lists each class, score, bounding box, and temporary track." : "Real browser-side inference. Camera frames stay on this device; identity matches use only opted-in enrolled profiles."}</p></div>
        <div className="engine-state-pill" role="status"><span className={`status-dot ${engineStatus.state === "ready" ? "status-dot-active" : ""}`} />{statusLabel}</div>
      </header>

      {error && <div className="inline-alert inline-alert-error vision-console-error" role="alert"><span>{error}</span><button type="button" className="button-secondary" onClick={() => { setError(""); }}>Dismiss</button></div>}
      {cameraStatus.state === "denied" && <div className="inline-alert inline-alert-error" role="alert">Camera permission was denied. Allow camera access in your browser settings and select Start vision to retry.</div>}
      {cameraStatus.state === "unavailable" && <div className="inline-alert inline-alert-error" role="alert">No usable camera was found. Connect a camera, choose a device, and try again.</div>}
      {!settingsReady && <p className="vision-loading" role="status">Loading saved vision settings…</p>}

      <div className="vision-workspace-grid">
        <div className="vision-main-column">
          <VisionControls
            mode={mode}
            fixedMode={fixedMode !== undefined}
            running={running}
            busy={busy || !settingsReady}
            facingMode={facingMode}
            cameraId={cameraId}
            cameras={cameras}
            onModeChange={setMode}
            onFacingModeChange={setFacingMode}
            onCameraChange={setCameraId}
            onStart={() => void startVision()}
            onStop={() => void stopVision()}
          />
          <CameraStage
            videoRef={videoRef}
            frame={frame}
            overlays={settings.overlays}
            cameraActive={cameraStatus.state === "active" && running}
            busy={busy}
            placeholder={cameraStatus.state === "denied" ? "Camera access was denied. Change permission and try again." : cameraStatus.state === "unavailable" ? "Connect or select a camera to begin." : "Start vision when you are ready. The camera stays off until then."}
          />
          <MetricsBar frame={frame} cameraActive={cameraStatus.state === "active" && running} />
        </div>
        <aside className="vision-results-column" aria-label="Current vision results">
          <div className="vision-side-status"><span className={`status-dot ${cameraStatus.state === "active" ? "status-dot-active" : ""}`} />{cameraStatusText(cameraStatus)}<span className="vision-side-divider">·</span>{statusLabel}</div>
          <ResultPanel frame={frame} objectOnly={isObjectOnly} />
          <div className="privacy-notice vision-privacy-notice" role="note"><strong>Privacy boundary</strong> Frames are processed locally and are never stored. Enrolled face descriptors stay in this browser profile. Recognition is not authentication; quality checks do not verify liveness.</div>
        </aside>
      </div>
    </section>
  );
}
