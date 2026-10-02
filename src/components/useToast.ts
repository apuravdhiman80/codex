import { useContext } from "react";
import { ToastContext } from "./toastContext";

export function useToast() {
  const context = useContext(ToastContext);
  return context ?? { showToast: () => undefined };
}
