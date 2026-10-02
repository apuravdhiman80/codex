import { useState } from "react";
import { Database, HardDrive, RotateCcw, Trash2 } from "lucide-react";
import { clearModelCache } from "../../ai/engine/modelCache";
import { clearAllLocalData, resetDemoData } from "./dataLifecycle";

export function DataControls() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(action: "demo" | "cache" | "all") {
    const questions = {
      demo: "Reset fictional demo profiles and events? Your own profiles and their face descriptors will be kept.",
      cache: "Clear downloaded model files from this browser? Profiles, face descriptors, and event history will be kept.",
      all: "Permanently delete all profiles, face descriptors, detection history, and saved settings from this browser? This cannot be undone.",
    };
    if (!window.confirm(questions[action])) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (action === "demo") { await resetDemoData(); setMessage("Demo records were reset. Your enrolled profiles were preserved."); }
      if (action === "cache") { await clearModelCache(); setMessage("Cached model files were removed. Your personal data was preserved."); }
      if (action === "all") { await clearAllLocalData(); setMessage("All local VisionID data was deleted. Camera processing was stopped first."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The data action could not be completed."); }
    finally { setBusy(false); }
  }

  return (
    <section className="ops-panel" aria-labelledby="data-controls-heading">
      <div className="ops-panel-heading"><div><p className="eyebrow">DEVICE DATA</p><h2 id="data-controls-heading">Manage local data</h2></div><Database size={20} /></div>
      <div className="data-action-list">
        <article><div><strong>Reset demo data</strong><p>Replace the fictional sample profiles and events. Your own records stay intact.</p></div><button className="button-secondary" type="button" disabled={busy} onClick={() => void run("demo")}><RotateCcw size={15} /> Reset demo</button></article>
        <article><div><strong>Clear model cache</strong><p>Remove versioned model files. Models can be downloaded again the next time you start vision.</p></div><button className="button-secondary" type="button" disabled={busy} onClick={() => void run("cache")}><HardDrive size={15} /> Clear cache</button></article>
        <article className="data-action-danger"><div><strong>Delete all local data</strong><p>Stop active camera inference and permanently delete every VisionID profile, descriptor, event, and saved setting on this device.</p></div><button className="button-danger" type="button" disabled={busy} onClick={() => void run("all")}><Trash2 size={15} /> Delete all data</button></article>
      </div>
      {busy && <p role="status" className="ops-help">Applying data change…</p>}
      {message && <p role="status" className="inline-alert inline-alert-success">{message}</p>}
      {error && <p role="alert" className="inline-alert inline-alert-error">{error}</p>}
    </section>
  );
}
