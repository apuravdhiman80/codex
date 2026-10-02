import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "neutral", live = false }: { children: ReactNode; tone?: "neutral" | "active" | "warning" | "error"; live?: boolean }) {
  return <span className={"status-badge status-badge-" + tone} role={live ? "status" : undefined}><span className="status-badge-dot" aria-hidden="true" />{children}</span>;
}
