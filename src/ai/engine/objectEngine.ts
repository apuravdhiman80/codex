import { DEFAULT_VISION_SETTINGS, normalizeVisionSettings, VISION_CONFIG } from "../../config/vision";
import type { VisionSettings } from "../../types/vision";
import { getInputDimensions, mapObjects, toCocoInput } from "./objectDetection";
import type { ObjectDetectorRuntime } from "./objectDetection";
import { loadCocoObjectDetector } from "./objectDetector";
import { getObjectModelUrl, getWasmBaseUrl } from "./modelManifest";
import type { FrameResult, ModelStatus, VisionEngine } from "./types";

interface ObjectEngineDependencies {
  loadObjectDetector(modelUrl: string, wasmBaseUrl: string): Promise<ObjectDetectorRuntime>;
  now(): number;
}

function defaultDependencies(): ObjectEngineDependencies {
  return {
    loadObjectDetector: loadCocoObjectDetector,
    now: () => performance.now(),
  };
}

export class ObjectDetectionEngine implements VisionEngine {
  private readonly dependencies: ObjectEngineDependencies;
  private settings: VisionSettings;
  private detector?: ObjectDetectorRuntime;
  private initialization?: Promise<void>;
  private inference?: Promise<FrameResult>;
  private readonly listeners = new Set<(status: ModelStatus) => void>();
  private currentStatus: ModelStatus = {
    state: "idle",
    message: "Object detector is not loaded.",
    progress: 0,
    activeModels: [],
  };

  constructor(
    dependencies: ObjectEngineDependencies = defaultDependencies(),
    settings: VisionSettings = DEFAULT_VISION_SETTINGS,
  ) {
    this.dependencies = dependencies;
    this.settings = normalizeVisionSettings(settings);
  }

  initialize(): Promise<void> {
    if (this.currentStatus.state === "ready" || this.currentStatus.state === "slow") return Promise.resolve();
    if (this.initialization) return this.initialization;
    this.setStatus({ state: "loading", message: "Loading object detector…", progress: 0.1, activeModels: [] });
    this.initialization = this.loadModel().catch((error: unknown) => {
      this.detector?.dispose?.();
      this.detector = undefined;
      this.setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "The object detector could not be initialized.",
        progress: 0,
        activeModels: [],
      });
      throw error;
    }).finally(() => {
      this.initialization = undefined;
    });
    return this.initialization;
  }

  private async loadModel(): Promise<void> {
    const origin = typeof location !== "undefined" ? location.origin : "http://localhost";
    this.detector = await this.dependencies.loadObjectDetector(
      getObjectModelUrl(origin),
      getWasmBaseUrl(origin),
    );
    const backend = this.detector.backend ?? "unknown";
    const slow = backend === "cpu";
    this.setStatus({
      state: slow ? "slow" : "ready",
      message: slow ? "Object detector is using CPU inference; detection may be slower." : "Object detector is ready.",
      backend,
      progress: 1,
      activeModels: ["COCO-SSD Lite"],
    });
  }

  detect(input: ImageBitmap | HTMLVideoElement): Promise<FrameResult> {
    if (this.inference) return this.inference;
    const current = this.runDetection(input).finally(() => {
      if (this.inference === current) this.inference = undefined;
    });
    this.inference = current;
    return current;
  }

  private async runDetection(input: ImageBitmap | HTMLVideoElement): Promise<FrameResult> {
    if (this.currentStatus.state !== "ready" && this.currentStatus.state !== "slow") {
      throw new Error("Object detector is not ready. Initialize the detector and retry.");
    }
    const detector = this.detector;
    if (!detector) throw new Error("Object detector is unavailable.");
    const inferenceStartedAt = this.dependencies.now();
    const { width, height } = getInputDimensions(input);
    const outputs = await detector.detect(
      toCocoInput(input, width, height),
      VISION_CONFIG.maxDetectedObjects,
      this.settings.objectThreshold,
    );
    const inferenceFinishedAt = this.dependencies.now();
    return {
      faces: [],
      objects: mapObjects(outputs, width, height),
      modelId: "coco-ssd-lite-mobilenet-v2",
      inferenceStartedAt,
      inferenceFinishedAt,
      warnings: [],
    };
  }

  status(): ModelStatus {
    return { ...this.currentStatus, activeModels: [...this.currentStatus.activeModels] };
  }

  subscribeStatus(listener: (status: ModelStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async configure(settings: VisionSettings): Promise<void> {
    this.settings = normalizeVisionSettings(settings);
  }

  async dispose(): Promise<void> {
    if (this.inference) await this.inference.catch(() => undefined);
    this.detector?.dispose?.();
    this.detector = undefined;
    this.setStatus({ state: "idle", message: "Object detector is stopped.", progress: 0, activeModels: [] });
  }

  similarity(): number {
    throw new Error("Face matching is not available in object-only mode.");
  }

  private setStatus(status: ModelStatus): void {
    this.currentStatus = status;
    const snapshot = this.status();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
