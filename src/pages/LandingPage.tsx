import { useEffect, useState } from "react";
import { Activity, ArrowRight, Boxes, Camera, Database, Eye, QrCode, ScanFace, ShieldCheck, UserRoundPlus } from "lucide-react";
import { Link } from "react-router";
import { AnalyticsPanel } from "../features/dashboard/AnalyticsPanel";
import { seedDemoData } from "../data/seed/seedDemoData";
import { useToast } from "../components/useToast";
import { StatusBadge } from "../components/StatusBadge";

const capabilities = [
  { icon: ScanFace, title: "Opt-in face recognition", description: "Enroll several quality-checked samples. Local embeddings are compared only with profiles recorded on this device." },
  { icon: Boxes, title: "Real-time object detection", description: "Run COCO-SSD Lite locally to find common objects and draw confidence-labelled boxes." },
  { icon: QrCode, title: "QR registration workflow", description: "Scan a profile QR or fill the manual form, review every field, then choose whether to enroll face samples." },
  { icon: Activity, title: "Fusion and event history", description: "See faces, conservative identity matches, and objects together. Review timestamped local events and measured performance." },
];

export function LandingPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState("");
  const { showToast } = useToast();
  useEffect(() => { document.title = "VisionID AI | Local computer vision"; }, []);

  async function loadDemoWorkspace() {
    setSeeding(true); setSeedError("");
    try {
      await seedDemoData();
      showToast({ title: "Demo workspace is ready", detail: "Fictional profiles and sample history are labeled as demo; they have no biometric templates.", tone: "success" });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The demo workspace could not be loaded.";
      setSeedError(message);
      showToast({ title: "Demo workspace could not load", detail: message, tone: "error" });
    } finally { setSeeding(false); }
  }

  return (
    <div className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <div className="landing-kicker"><StatusBadge>LOCAL MODE · CAMERA OFF</StatusBadge><span>PRIVATE COMPUTER VISION WORKSPACE</span></div>
          <h1 id="landing-title">VisionID AI</h1>
          <p className="landing-subtitle">See people and objects in real time.<br /><span>Keep camera processing on this device.</span></p>
          <p className="landing-description">A browser-based vision console for opt-in identity matching and object detection. Your camera stays off until you start a session.</p>
          <div className="landing-actions">
            <Link className="button-primary landing-primary-action" to="/console"><Camera size={16} /> Start Vision <ArrowRight size={15} /></Link>
            <Link className="button-secondary" to="/enroll"><UserRoundPlus size={16} /> Enroll Person</Link>
            <Link className="button-secondary" to="/enroll#qr-enrollment"><QrCode size={16} /> Scan QR</Link>
            <Link className="button-secondary" to="/objects"><Boxes size={16} /> Object Detection</Link>
          </div>
          {seedError && <p className="inline-alert inline-alert-error" role="alert">{seedError}</p>}
          <div className="hero-privacy-line"><ShieldCheck size={15} /><span>Frames stay local · No login · No cloud database</span></div>
        </div>
        <div className="landing-visual" aria-label="Illustrative camera overlay preview. No camera is running.">
          <div className="landing-visual-top"><span><i /> INTERFACE PREVIEW</span><StatusBadge>CAMERA OFF</StatusBadge></div>
          <div className="preview-stage">
            <div className="preview-grid" aria-hidden="true" />
            <div className="preview-scan-line" aria-hidden="true" />
            <div className="preview-face-box"><span>FACE REGION · ILLUSTRATION</span><i className="preview-landmark preview-left-eye" /><i className="preview-landmark preview-right-eye" /><i className="preview-landmark preview-mouth" /></div>
            <div className="preview-person-tag"><ScanFace size={13} /><span>Identity match</span><b>Opt-in only</b></div>
            <div className="preview-object-box"><span>OBJECT BOX · ILLUSTRATION</span></div>
            <div className="preview-bottle"><span aria-hidden="true" /></div>
            <div className="preview-object-tag"><Boxes size={13} /> Sample object label</div>
            <div className="preview-stage-footer"><span>STATIC VISUAL · NO DETECTIONS</span><span>0 FPS</span></div>
          </div>
          <div className="preview-footnote"><Eye size={14} /> Illustration only. Start Vision to use your camera and actual AI models.</div>
        </div>
      </section>

      <section className="quick-start-section" aria-labelledby="quick-start-heading">
        <div className="landing-section-title"><div><p className="eyebrow">THREE SIMPLE STEPS</p><h2 id="quick-start-heading">From setup to live vision</h2></div><p>The browser asks for camera access only when you choose a camera action.</p></div>
        <ol className="quick-start-grid">
          <li><span className="quick-step-number">01</span><div><strong>Open the console</strong><p>Choose Fusion, Recognition, or Object Detection, then allow camera permission.</p><Link to="/console">Open Vision Console <ArrowRight size={13} /></Link></div></li>
          <li><span className="quick-step-number">02</span><div><strong>Add a profile</strong><p>Scan QR or use the form. Review the payload and record explicit consent before enrolling face samples.</p><Link to="/enroll">Enroll a person <ArrowRight size={13} /></Link></div></li>
          <li><span className="quick-step-number">03</span><div><strong>Review local results</strong><p>Inspect events, confidence measures, and performance. Export or delete this browser’s data anytime.</p><Link to="/history">View detection history <ArrowRight size={13} /></Link></div></li>
        </ol>
      </section>

      <section className="capabilities-section" aria-labelledby="capabilities-heading">
        <div className="landing-section-title"><div><p className="eyebrow">VISION FUSION</p><h2 id="capabilities-heading">One local pipeline. Two kinds of vision.</h2></div><p>Model output stays clearly labeled as detection confidence or identity similarity.</p></div>
        <div className="capability-grid">{capabilities.map(({ icon: Icon, title, description }) => <article className="capability-card" key={title}><span className="capability-icon"><Icon size={18} /></span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="demo-workspace-card" aria-labelledby="demo-workspace-heading"><div className="demo-workspace-icon"><Database size={20} /></div><div><p className="eyebrow">OPTIONAL SAMPLE DATA</p><h2 id="demo-workspace-heading">Explore with a fictional demo workspace</h2><p>Loads three clearly marked profiles and sample history. The profiles have no face templates, so they can never be recognized by the camera.</p></div><button className="button-secondary" type="button" disabled={seeding} onClick={() => void loadDemoWorkspace()}>{seeding ? "Loading demo…" : "Load demo workspace"}</button></section>

      <section className="architecture-strip" aria-label="Local vision architecture"><div><span>01</span><strong>Browser camera</strong><small>Permission-gated</small></div><ArrowRight size={15} /><div><span>02</span><strong>Vision worker</strong><small>Face + object models</small></div><ArrowRight size={15} /><div><span>03</span><strong>Local data</strong><small>IndexedDB + cache</small></div><ArrowRight size={15} /><div><span>04</span><strong>Vision dashboard</strong><small>Scores + history</small></div></section>

      <AnalyticsPanel />

      <aside className="landing-privacy" aria-label="Privacy and limitations"><ShieldCheck size={18} /><div><strong>Privacy and identity boundary</strong><p>Camera frames are processed locally and discarded. Face identification is limited to profiles whose owners completed enrollment consent. Unknown faces remain unknown. This demonstration is not authentication, liveness verification, or an access-control system.</p></div><Link to="/settings">Privacy settings <ArrowRight size={13} /></Link></aside>
    </div>
  );
}
