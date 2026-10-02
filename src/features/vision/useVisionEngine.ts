import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import { createVisionEngine } from "../../ai/worker/workerVisionEngine";
import { loadVisionEngine } from "../../ai/engine/modelLoader";
import type { ModelStatus, VisionEngine } from "../../ai/engine/types";
import type { VisionSettings } from "../../types/vision";

export interface VisionEngineController {
  engine: VisionEngine;
  status: ModelStatus;
  initialize(): Promise<void>;
  configure(settings: VisionSettings): Promise<void>;
  dispose(): Promise<void>;
}

export function useVisionEngine(settings: VisionSettings = DEFAULT_VISION_SETTINGS): VisionEngineController {
  const [engine] = useState(() => createVisionEngine(settings));
  const [status, setStatus] = useState<ModelStatus>(() => engine.status());

  useEffect(() => {
    const unsubscribe = engine.subscribeStatus?.(setStatus);
    return () => {
      unsubscribe?.();
      void engine.dispose();
    };
  }, [engine]);

  const initialize = useCallback(() => loadVisionEngine(engine, setStatus), [engine]);
  const configure = useCallback(async (next: VisionSettings) => {
    await engine.configure(next);
    setStatus(engine.status());
  }, [engine]);
  const dispose = useCallback(async () => {
    await engine.dispose();
    setStatus(engine.status());
  }, [engine]);

  return useMemo(() => ({ engine, status, initialize, configure, dispose }), [engine, status, initialize, configure, dispose]);
}
