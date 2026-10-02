import type { ReactNode } from "react";

export function EmptyState({ title, description, action, eyebrow = "NOTHING HERE YET" }: { title: string; description: string; action?: ReactNode; eyebrow?: string }) {
  return <div className="empty-state"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p>{action && <div className="empty-state-action">{action}</div>}</div>;
}
