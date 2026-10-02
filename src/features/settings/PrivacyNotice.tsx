import { EyeOff, HardDrive, ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <section className="ops-panel privacy-details" aria-labelledby="privacy-detail-heading">
      <div className="ops-panel-heading"><div><p className="eyebrow">LOCAL PROCESSING</p><h2 id="privacy-detail-heading">Your data stays in this browser</h2></div><ShieldCheck size={20} /></div>
      <div className="privacy-detail-grid">
        <article><EyeOff size={18} /><strong>Camera frames</strong><p>Frames are processed in the browser and discarded after inference. VisionID does not upload camera video or snapshots.</p></article>
        <article><HardDrive size={18} /><strong>Profiles and descriptors</strong><p>Opted-in profile fields and face descriptors are stored in this browser’s IndexedDB. Other browser profiles and devices do not share them.</p></article>
        <article><ShieldCheck size={18} /><strong>Control and limits</strong><p>Delete profiles, demo records, history, cache, or all local data here. Recognition can be affected by camera quality and is not authentication or liveness verification.</p></article>
      </div>
      <p className="ops-help">Model files are fetched from the app’s same-origin deployment and may be kept in browser cache. Normal browser storage, backup, and synchronization behavior is controlled by your browser and device.</p>
    </section>
  );
}
