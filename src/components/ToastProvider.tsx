import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { ToastContext, type ToastInput, type ToastTone } from "./toastContext";
interface ToastEntry extends ToastInput { id: number; tone: ToastTone }
let sequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastEntry[]>([]);
  const timers = useRef(new Map<number, number>());
  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const showToast = useCallback((input: ToastInput) => {
    const id = ++sequence;
    const item: ToastEntry = { id, title: input.title, ...(input.detail ? { detail: input.detail } : {}), tone: input.tone ?? "info" };
    setItems((current) => [...current.slice(-3), item]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), 6000));
  }, [dismiss]);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-label="Notifications" aria-live="polite" aria-relevant="additions text">{items.map((item) => {
    const Icon = item.tone === "success" ? Check : item.tone === "error" ? CircleAlert : Info;
    return <div className={"toast-item toast-" + item.tone} key={item.id} role={item.tone === "error" ? "alert" : "status"}><Icon size={17} aria-hidden="true" /><div><strong>{item.title}</strong>{item.detail && <span>{item.detail}</span>}</div><button type="button" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}><X size={14} /></button></div>;
  })}</div></ToastContext.Provider>;
}
