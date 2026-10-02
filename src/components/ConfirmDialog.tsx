import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  intent?: "neutral" | "danger";
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = "Cancel", intent = "neutral", busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const cancelAction = useRef(onCancel);
  const busyState = useRef(busy);
  const id = useId();
  cancelAction.current = onCancel;
  busyState.current = busy;

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyState.current) { event.preventDefault(); cancelAction.current(); }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [open]);

  if (!open) return null;
  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && busy) event.stopPropagation();
  }
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div ref={panelRef} className="confirm-dialog" role={intent === "danger" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={id + "-title"} aria-describedby={id + "-copy"} onKeyDown={handleKeyDown}>
        <button className="dialog-close" type="button" aria-label="Close confirmation" disabled={busy} onClick={onCancel}><X size={17} /></button>
        <div className={"dialog-icon " + (intent === "danger" ? "dialog-icon-danger" : "")}><AlertTriangle size={20} aria-hidden="true" /></div>
        <h2 id={id + "-title"}>{title}</h2>
        <p id={id + "-copy"}>{description}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="button-secondary" type="button" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
          <button className={intent === "danger" ? "button-danger" : "button-primary"} type="button" disabled={busy} onClick={onConfirm}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
