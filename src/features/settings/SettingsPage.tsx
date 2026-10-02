import { useEffect, useState } from "react";
import { Check, Cpu, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import { cameraService } from "../camera/cameraService";
import { cacheModelAssets, clearModelCache } from "../../ai/engine/modelCache";
import { MODEL_MANIFEST, MODEL_CACHE_NAME } from "../../ai/engine/modelManifest";
import type { CameraFacingMode, ModelVariant, VisionSettings } from "../../types/vision";
import { applySettings, currentSettings } from "./settingsService";
import { DataControls } from "./DataControls";
import { PrivacyNotice } from "./PrivacyNotice";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/useToast";
import { LoadingState } from "../../components/LoadingState";

const PRESETS: Record<ModelVariant, Pick<VisionSettings, "maxInputWidth" | "maxInputHeight" | "inferenceIntervalMs">> = {
  performance: { maxInputWidth: 320, maxInputHeight: 240, inferenceIntervalMs: 420 },
  balanced: { maxInputWidth: 640, maxInputHeight: 480, inferenceIntervalMs: 180 },
  quality: { maxInputWidth: 960, maxInputHeight: 720, inferenceIntervalMs: 100 },
};

function SettingRange({ label, value, min, max, step, suffix = "", hint, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; hint: string; onChange(value: number): void }) {
  return <label className="setting-range"><span><strong>{label}</strong><output>{step < 1 ? value.toFixed(2) : `${value}${suffix}`}</output></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /><small>{hint}</small></label>;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<VisionSettings>(DEFAULT_VISION_SETTINGS);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modelCacheReady, setModelCacheReady] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    document.title = "Settings | VisionID AI";
    let active = true;
    void Promise.all([currentSettings(), cameraService.enumerateCameras(), typeof caches === "undefined" ? Promise.resolve(false) : caches.keys().then((names) => names.includes(MODEL_CACHE_NAME))])
      .then(([loaded, devices, cached]) => { if (active) { setSettings(loaded); setCameras(devices); setModelCacheReady(cached); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Settings could not be loaded. Defaults are active."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function patch<K extends keyof VisionSettings>(key: K, value: VisionSettings[K]) { setSettings((current) => ({ ...current, [key]: value })); }
  function setPreset(value: ModelVariant) { setSettings((current) => ({ ...current, modelVariant: value, ...PRESETS[value] })); }

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try { const stored = await applySettings(settings); setSettings(stored); setMessage("Settings saved and active vision configuration updated."); showToast({ title: "Settings saved", tone: "success" }); }
    catch (cause) { const detail = cause instanceof Error ? cause.message : "Settings could not be applied."; setError(detail); showToast({ title: "Settings could not be applied", detail, tone: "error" }); }
    finally { setSaving(false); }
  }

  async function prepareModelCache() {
    setCacheBusy(true); setError(""); setMessage("");
    try { await cacheModelAssets(MODEL_MANIFEST); setModelCacheReady(true); setMessage("Model files were verified and cached for this browser."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Model files could not be cached."); }
    finally { setCacheBusy(false); }
  }

  async function clearCache() {
    setCacheBusy(true); setError(""); setMessage("");
    try { await clearModelCache(); setModelCacheReady(false); setMessage("Cached model files were removed."); showToast({ title: "Model cache cleared", tone: "success" }); }
    catch (cause) { const detail = cause instanceof Error ? cause.message : "The model cache could not be cleared."; setError(detail); showToast({ title: "Model cache could not be cleared", detail, tone: "error" }); }
    finally { setCacheBusy(false); setClearCacheDialogOpen(false); }
  }

  if (loading) return <section className="ops-page"><h1>Settings</h1><LoadingState title="Loading settings" description="Reading this browser’s saved configuration" /></section>;
  return (
    <section className="ops-page" aria-labelledby="settings-heading">
      <header className="ops-heading"><div><p className="eyebrow">LOCAL CONFIGURATION</p><h1 id="settings-heading">Settings</h1><p>Adjust real detector thresholds, model input, processing cadence, camera, and local data controls.</p></div><div className="ops-heading-icon"><SlidersHorizontal size={23} /></div></header>
      {error && <p role="alert" className="inline-alert inline-alert-error">{error}</p>}{message && <p role="status" className="inline-alert inline-alert-success"><Check size={16} /> {message}</p>}
      <section className="ops-panel" aria-labelledby="recognition-settings-heading"><div className="ops-panel-heading"><div><p className="eyebrow">IDENTITY AND DETECTION</p><h2 id="recognition-settings-heading">Recognition thresholds</h2></div></div>
        <div className="setting-grid">
          <SettingRange label="Object detector threshold" value={settings.objectThreshold} min={0.1} max={0.99} step={0.01} hint="Objects below this detector score are filtered from results." onChange={(value) => patch("objectThreshold", value)} />
          <SettingRange label="Face recognition threshold" value={settings.recognitionThreshold} min={0.4} max={0.9} step={0.01} hint="A higher value is stricter. Insufficient matches remain unknown." onChange={(value) => patch("recognitionThreshold", value)} />
          <SettingRange label="Unknown match margin" value={settings.unknownMatchMargin} min={0.01} max={0.2} step={0.01} hint="Minimum separation from the next identity candidate for a conservative match." onChange={(value) => patch("unknownMatchMargin", value)} />
        </div>
      </section>
      <section className="ops-panel" aria-labelledby="processing-settings-heading"><div className="ops-panel-heading"><div><p className="eyebrow">BROWSER INFERENCE</p><h2 id="processing-settings-heading">Processing and models</h2></div><Cpu size={20} /></div>
        <div className="setting-grid setting-grid-top">
          <label className="ops-field">Performance preset<select value={settings.modelVariant} onChange={(event) => setPreset(event.target.value as ModelVariant)}><option value="performance">Performance · 320 × 240 · 420 ms cadence</option><option value="balanced">Balanced · 640 × 480 · 180 ms cadence</option><option value="quality">Quality · 960 × 720 · 100 ms cadence</option></select><small>Presets set actual input resolution and frame interval. Higher settings require more hardware.</small></label>
          <label className="ops-field">Camera<select value={settings.cameraId ?? ""} onChange={(event) => patch("cameraId", event.target.value || null)}><option value="">Use selected facing direction</option>{cameras.map((camera, index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>)}</select></label>
          <label className="ops-field">Camera facing<select value={settings.cameraFacingMode} onChange={(event) => patch("cameraFacingMode", event.target.value as CameraFacingMode)}><option value="user">Front / user facing</option><option value="environment">Rear / environment facing</option></select></label>
          <label className="ops-field">Theme<select value={settings.theme} onChange={(event) => patch("theme", event.target.value as VisionSettings["theme"])}><option value="dark">Dark</option><option value="light">Light</option><option value="system">Use system preference</option></select></label>
          <label className="ops-field">Event retention<select value={settings.eventRetentionDays} onChange={(event) => patch("eventRetentionDays", Number(event.target.value))}><option value={0}>Keep until manually cleared</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option></select></label>
        </div>
        <div className="setting-grid"><SettingRange label="Maximum model input width" value={settings.maxInputWidth} min={160} max={1280} step={32} suffix=" px" hint="Input frames are resized before transfer to the inference worker." onChange={(value) => patch("maxInputWidth", value)} /><SettingRange label="Maximum model input height" value={settings.maxInputHeight} min={120} max={960} step={24} suffix=" px" hint="Larger frames can improve small-object visibility at a performance cost." onChange={(value) => patch("maxInputHeight", value)} /><SettingRange label="Inference interval" value={settings.inferenceIntervalMs} min={80} max={1000} step={20} suffix=" ms" hint="Minimum delay between completed inference frames; results never overlap." onChange={(value) => patch("inferenceIntervalMs", value)} /></div>
        <div className="overlay-options"><strong>Camera overlays</strong>{(["faces", "objects", "landmarks"] as const).map((key) => <label key={key}><input type="checkbox" checked={settings.overlays[key]} onChange={(event) => patch("overlays", { ...settings.overlays, [key]: event.target.checked })} /> Show {key}</label>)}</div>
        <div className="model-cache-card"><div><strong>Active browser models</strong><p>Human 3.3.6 face detector/embedding · COCO-SSD Lite MobileNet v2 object detector</p><code>{MODEL_MANIFEST.modelId}</code><small>{modelCacheReady ? "A versioned model cache is present in this browser." : "Models load locally when vision starts; optional offline cache is not present."}</small></div><div className="ops-actions"><button className="button-secondary" type="button" disabled={cacheBusy} onClick={() => void prepareModelCache()}>{cacheBusy ? "Preparing…" : "Prepare offline cache"}</button>{modelCacheReady && <button className="button-secondary" type="button" disabled={cacheBusy} onClick={() => setClearCacheDialogOpen(true)}>Clear model cache</button>}</div></div>
        <p className="ops-help">The bundled face embedding weights have upstream dataset license restrictions; review <a href="/MODEL_NOTICES.md" target="_blank" rel="noreferrer">model notices</a> before any use beyond personal evaluation.</p>
      </section>
      <section className="ops-panel" aria-labelledby="quality-heading"><div className="ops-panel-heading"><div><p className="eyebrow">ENROLLMENT QUALITY GATES</p><h2 id="quality-heading">Face sample quality</h2></div></div><div className="setting-grid"><SettingRange label="Minimum face size ratio" value={settings.faceQuality.minSizeRatio} min={0.05} max={0.5} step={0.01} hint="Minimum face width relative to the captured frame." onChange={(value) => patch("faceQuality", { ...settings.faceQuality, minSizeRatio: value })} /><SettingRange label="Minimum sharpness" value={settings.faceQuality.minSharpness} min={0} max={180} step={5} hint="Blurrier samples are rejected before enrollment." onChange={(value) => patch("faceQuality", { ...settings.faceQuality, minSharpness: value })} /><SettingRange label="Minimum brightness" value={settings.faceQuality.minBrightness} min={0} max={160} step={5} hint="Underexposed samples below this level are rejected." onChange={(value) => patch("faceQuality", { ...settings.faceQuality, minBrightness: value })} /><SettingRange label="Maximum brightness" value={settings.faceQuality.maxBrightness} min={100} max={255} step={5} hint="Overexposed samples above this level are rejected." onChange={(value) => patch("faceQuality", { ...settings.faceQuality, maxBrightness: value })} /><SettingRange label="Maximum head yaw" value={settings.faceQuality.maxYawDegrees} min={5} max={60} step={1} suffix="°" hint="Reject samples with more extreme side turns." onChange={(value) => patch("faceQuality", { ...settings.faceQuality, maxYawDegrees: value })} /><SettingRange label="Maximum head pitch" value={settings.faceQuality.maxPitchDegrees} min={5} max={60} step={1} suffix="°" hint="Reject samples with more extreme up/down tilt." onChange={(value) => patch("faceQuality", { ...settings.faceQuality, maxPitchDegrees: value })} /></div></section>
      <PrivacyNotice /><DataControls />
      <div className="ops-sticky-actions"><button className="button-secondary" type="button" onClick={() => { setSettings(DEFAULT_VISION_SETTINGS); setMessage("Unsaved values were reset. Save to apply defaults."); }}><RotateCcw size={15} /> Reset form</button><button className="button-primary" type="button" disabled={saving} onClick={() => void save()}><Save size={15} /> {saving ? "Applying…" : "Save settings"}</button></div>
      <ConfirmDialog open={clearCacheDialogOpen} title="Clear model cache?" description="Downloaded model files will be removed from this browser. Models will be downloaded again when VisionID is used. Your profiles, face descriptors, and event history will stay on this device." confirmLabel="Clear model cache" intent="danger" busy={cacheBusy} onCancel={() => setClearCacheDialogOpen(false)} onConfirm={() => void clearCache()} />
    </section>
  );
}
