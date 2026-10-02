import { AlertTriangle, RotateCw } from "lucide-react";

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return <div className="error-state" role="alert"><AlertTriangle size={19} aria-hidden="true" /><div><strong>{title}</strong><span>{message}</span></div>{onRetry && <button className="button-secondary" type="button" onClick={onRetry}><RotateCw size={14} /> Retry</button>}</div>;
}
