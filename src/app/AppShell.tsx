import { useEffect, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet } from "react-router";
import {
  Activity,
  Aperture,
  Camera,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Menu,
  ScanFace,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import { getSessionMetrics, subscribeSessionMetrics } from "../features/vision/sessionMetrics";

const navigation = [
  { label: "Overview", to: "/", icon: LayoutDashboard, end: true },
  { label: "Vision Console", to: "/console", icon: Camera },
  { label: "Object Detection", to: "/objects", icon: Aperture },
  { label: "Enroll Person", to: "/enroll", icon: ScanFace },
  { label: "People Directory", to: "/people", icon: UsersRound },
  { label: "Detection History", to: "/history", icon: Activity },
  { label: "Settings", to: "/settings", icon: Settings2 },
];

export function AppShell() {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const metrics = useSyncExternalStore(subscribeSessionMetrics, getSessionMetrics, getSessionMetrics);
  useEffect(() => { void import("../features/settings/settingsService").then(({ currentSettings }) => currentSettings()).catch(() => undefined); }, []);

  return (
    <div className="vision-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className={`sidebar ${mobileNavigationOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <ScanFace size={21} strokeWidth={1.8} />
          </div>
          <div>
            <div className="brand-name">VISIONID</div>
            <div className="brand-edition">AI VISION SYSTEM</div>
          </div>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavigationOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-navigation" aria-label="Primary navigation">
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileNavigationOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {label === "Vision Console" && <span className={`nav-live-dot ${metrics.cameraActive ? "nav-live-dot-active" : ""}`} aria-label={metrics.cameraActive ? "Camera active" : "Camera inactive"} />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <section className="privacy-card" aria-label="Privacy mode">
          <div className="privacy-card-icon">
            <ScanFace size={16} aria-hidden="true" />
          </div>
          <p className="privacy-card-title">Private by design</p>
          <p className="privacy-card-copy">
            Camera frames and enrolled profiles stay on this device.
          </p>
        </section>

        <a className="help-link" href="/">
          <CircleHelp size={16} aria-hidden="true" />
          <span>Help &amp; guidance</span>
          <ChevronRight size={14} aria-hidden="true" />
        </a>
        <div className="sidebar-footer">
          <span className="footer-dot" />
          <span>LOCAL DEVICE</span>
          <span className="footer-version">V1.0</span>
        </div>
      </aside>

      {mobileNavigationOpen && (
        <button
          className="mobile-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavigationOpen(false)}
        />
      )}

      <div className="main-column">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-toggle"
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileNavigationOpen}
            onClick={() => setMobileNavigationOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb" aria-label="Page context">
            <span className="breadcrumb-product">VisionID AI</span>
            <ChevronRight size={14} aria-hidden="true" />
            <span className="breadcrumb-current">Workspace</span>
          </div>
          <div className="topbar-status" role="status">
            <span className="status-pulse" />
            <span>{metrics.cameraActive ? "CAMERA ACTIVE" : "ENGINE STANDBY"}</span>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>

      </div>
    </div>
  );
}
