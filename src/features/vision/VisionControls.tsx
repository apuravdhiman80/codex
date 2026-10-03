import type { CameraFacingMode, VisionMode } from "../../types/vision";

interface VisionControlsProps {
  mode: VisionMode;
  fixedMode: boolean;
  running: boolean;
  busy: boolean;
  facingMode: CameraFacingMode;
  cameraId: string;
  cameras: MediaDeviceInfo[];
  onModeChange(mode: VisionMode): void;
  onFacingModeChange(mode: CameraFacingMode): void;
  onCameraChange(cameraId: string): void;
  onStart(): void;
  onStop(): void;
}

export function VisionControls({
  mode, fixedMode, running, busy, facingMode, cameraId, cameras,
  onModeChange, onFacingModeChange, onCameraChange, onStart, onStop,
}: VisionControlsProps) {
  return (
    <section className="vision-controls" aria-label="Object detection controls">
      {!fixedMode && <div className="mode-control" role="group" aria-label="Vision mode">
        <button type="button" aria-pressed={mode === "fusion"} className={mode === "fusion" ? "mode-button mode-button-active" : "mode-button"} disabled={running} onClick={() => onModeChange("fusion")}>Vision Fusion</button>
        <button type="button" aria-pressed={mode === "recognition"} className={mode === "recognition" ? "mode-button mode-button-active" : "mode-button"} disabled={running} onClick={() => onModeChange("recognition")}>Recognition only</button>
      </div>}
      <div className="camera-control-selects">
        <label>Camera facing
          <select value={facingMode} disabled={running} onChange={(event) => onFacingModeChange(event.target.value as CameraFacingMode)}>
            <option value="user">Front camera</option><option value="environment">Rear camera</option>
          </select>
        </label>
        <label>Camera device
          <select value={cameraId} disabled={running} onChange={(event) => onCameraChange(event.target.value)}>
            <option value="">Automatic</option>
            {cameras.map((camera, index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>)}
          </select>
        </label>
      </div>
      {running
        ? <button className="button-danger vision-run-button" type="button" onClick={onStop}>Stop detection</button>
        : <button className="button-primary vision-run-button" type="button" disabled={busy} onClick={onStart}>{busy ? "Loading object detector…" : "Start object detection"}</button>}
    </section>
  );
}
