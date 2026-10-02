import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LoadingState({ title, description, progress }: { title: string; description: string; progress?: number }) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  const boundedProgress = progress === undefined ? undefined : Math.max(0, Math.min(100, progress));
  return <div className="loading-state" role="status" aria-live="polite" aria-busy="true"><LoaderCircle className={reducedMotion ? "loading-spinner" : "loading-spinner is-spinning"} size={19} aria-hidden="true" /><div><strong>{title}</strong><span>{description}</span></div>{boundedProgress !== undefined && <div className="loading-progress" aria-label={boundedProgress + "% complete"}><i style={{ width: boundedProgress + "%" }} /></div>}</div>;
}
