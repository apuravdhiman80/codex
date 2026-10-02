import type { ModelStatus, VisionEngine } from "./types";

export async function loadVisionEngine(
  engine: VisionEngine,
  onStatus?: (status: ModelStatus) => void,
): Promise<void> {
  onStatus?.({ state: "loading", message: "Preparing local vision models…", progress: 0, activeModels: [] });
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof location !== "undefined" && location.protocol !== "file:") {
    try {
      const registration = await navigator.serviceWorker.register("/vision-cache-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller && typeof window !== "undefined") {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 1800);
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
      }
      void registration;
    } catch {
      // Model requests remain same-origin; caching is an optimization, not a load prerequisite.
    }
  }
  const unsubscribe = engine.subscribeStatus?.(onStatus ?? (() => undefined));
  try {
    await engine.initialize();
    onStatus?.(engine.status());
  } catch (error) {
    const previous = engine.status();
    const status: ModelStatus = {
      ...previous,
      state: "error",
      message: error instanceof Error ? error.message : "The local vision models could not be loaded.",
      progress: 0,
    };
    onStatus?.(status);
    throw error;
  } finally {
    unsubscribe?.();
  }
}
