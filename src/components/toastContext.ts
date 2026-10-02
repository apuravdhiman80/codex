import { createContext } from "react";

export type ToastTone = "success" | "error" | "info";
export interface ToastInput { title: string; detail?: string; tone?: ToastTone }
export interface ToastContextValue { showToast(input: ToastInput): void }
export const ToastContext = createContext<ToastContextValue | null>(null);
