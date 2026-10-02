import { RouterProvider } from "react-router";
import { appRouter } from "./router";
import { ToastProvider } from "../components/ToastProvider";

export function App() {
  return <ToastProvider><RouterProvider router={appRouter} /></ToastProvider>;
}
