import { Radar } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type RouteShellPageProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function RouteShellPage({
  title,
  description = "Your local vision workspace is ready to configure.",
  children,
}: RouteShellPageProps) {
  useEffect(() => {
    document.title = `${title} | VisionID AI`;
  }, [title]);

  return (
    <section className="route-shell-page">
      <div className="route-heading-row">
        <div>
          <p className="eyebrow">LOCAL VISION WORKSPACE</p>
          <h1>{title}</h1>
          <p className="route-description">{description}</p>
        </div>
        <div className="route-heading-icon" aria-hidden="true">
          <Radar size={26} strokeWidth={1.5} />
        </div>
      </div>
      <div className="route-shell-card">
        <div className="route-shell-card-topline">
          <span className="route-shell-status-dot" />
          <span>DEVICE-LOCAL SESSION</span>
        </div>
        <p>
          Vision processing is stopped until you choose a camera action. No
          frames or profile records leave this device.
        </p>
        {children}
      </div>
    </section>
  );
}
