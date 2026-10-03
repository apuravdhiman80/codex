import type { ModelStatus, VisionEngine } from "./types";

export async function loadVisionEngine(
  engine: VisionEngine,
  onStatus?: (status: ModelStatus) => void,
): Promise<void> {
  onStatus?.({ state: "loading", message: "Preparing local object detector…", progress: 0, activeModels: [] });
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
