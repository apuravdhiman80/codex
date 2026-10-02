import { useState } from "react";
import { Database, HardDrive, RotateCcw, Trash2 } from "lucide-react";
import { clearModelCache } from "../../ai/engine/modelCache";
import { clearAllLocalData, resetDemoData } from "./dataLifecycle";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/useToast";

export function DataControls() {
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<"demo" | "cache" | "all" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { showToast } = useToast();

  async function run(action: "demo" | "cache" | "all") {
    setBusy(true); setError(""); setMessage("");
    try {
      let success = "";
      if (action === "demo") { await resetDemoData(); success = "Demo records were reset. Your enrolled profiles were preserved."; }
      if (action === "cache") { await clearModelCache(); success = "Cached model files were removed. Your personal data was preserved."; }
      if (action === "all") { await clearAllLocalData(); success = "All local VisionID data was deleted. Camera processing was stopped first."; }
      setMessage(success);
      showToast({ title: "Local data updated", detail: success, tone: "success" });
      setPendingAction(null);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "The data action could not be completed.";
      setError(detail);
      showToast({ title: "Data change failed", detail, tone: "error" });
    } finally { setBusy(false); }
  }

  return (
    <section className="ops-panel" aria-labelledby="data-controls-heading">
      <div className="ops-panel-heading"><div><p className="eyebrow">DEVICE DATA</p><h2 id="data-controls-heading">Manage local data</h2></div><Database size={20} /></div>
      <div className="data-action-list">
        <article><div><strong>Reset demo data</strong><p>Replace the fictional sample profiles and events. Your own records stay intact.</p></div><button className="button-secondary" type="button" disabled={busy} onClick={() => setPendingAction("demo")}><RotateCcw size={15} /> Reset demo</button></article>
        <article><div><strong>Clear model cache</strong><p>Remove versioned model files. Models can be downloaded again the next time you start vision.</p></div><button className="button-secondary" type="button" disabled={busy} onClick={() => setPendingAction("cache")}><HardDrive size={15} /> Clear cache</button></article>
        <article className="data-action-danger"><div><strong>Delete all local data</strong><p>Stop active camera inference and permanently delete every VisionID profile, descriptor, event, and saved setting on this device.</p></div><button className="button-danger" type="button" disabled={busy} onClick={() => setPendingAction("all")}><Trash2 size={15} /> Delete all data</button></article>
      </div>
      {busy && <p role="status" className="ops-help">Applying data change…</p>}
      {message && <p role="status" className="inline-alert inline-alert-success">{message}</p>}
      {error && <p role="alert" className="inline-alert inline-alert-error">{error}</p>}
      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction === "demo" ? "Reset demo data?" : pendingAction === "cache" ? "Clear model cache?" : "Delete all local data?"}
        description={pendingAction === "demo" ? "Fictional demo profiles and events will be replaced. Enrolled profiles and their face descriptors will be kept." : pendingAction === "cache" ? "Downloaded model files will be removed. Profiles, face descriptors, and event history will be kept." : "Every profile, face descriptor, event, and saved setting in this browser will be deleted. Vision processing will stop first. This cannot be undone."}
        confirmLabel={pendingAction === "demo" ? "Reset demo" : pendingAction === "cache" ? "Clear cache" : "Delete all data"}
        intent="danger"
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => { if (pendingAction) void run(pendingAction); }}
      />
    </section>
  );
}
