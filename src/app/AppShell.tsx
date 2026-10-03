import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import {
  Boxes,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { label: "Object Detection", to: "/", icon: Boxes, end: true },
];

export function AppShell() {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="vision-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className={`sidebar ${mobileNavigationOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Boxes size={21} strokeWidth={1.8} />
          </div>
          <div>
            <div className="brand-name">OBJECT DETECTOR</div>
            <div className="brand-edition">LOCAL INFERENCE</div>
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
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <section className="privacy-card" aria-label="Local storage">
          <div className="privacy-card-icon">
            <Boxes size={16} aria-hidden="true" />
          </div>
          <p className="privacy-card-title">Processed locally</p>
          <p className="privacy-card-copy">
            Camera frames stay on this device and are not stored.
          </p>
        </section>

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
            <span className="breadcrumb-product">Object Detector</span>
            <ChevronRight size={14} aria-hidden="true" />
            <span className="breadcrumb-current">Object detection</span>
          </div>
          <div className="topbar-status" role="status">
            <span className="status-pulse" />
            <span>CAMERA OFF</span>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>

      </div>
    </div>
  );
}
