import type { BoundingBox, FaceResult, ObjectResult, VisionSettings } from "../../types/vision";

export type ModelState = "idle" | "loading" | "ready" | "slow" | "unsupported" | "error";

export interface ModelStatus {
  state: ModelState;
  message: string;
  backend?: "webgl" | "wasm" | "cpu" | "unknown";
  progress: number;
  activeModels: string[];
}

export interface FrameResult {
  faces: FaceResult[];
  objects: ObjectResult[];
  modelId: string;
  inferenceStartedAt: number;
  inferenceFinishedAt: number;
  warnings: string[];
}

export interface VisionEngine {
  initialize(): Promise<void>;
  detect(input: ImageBitmap | HTMLVideoElement): Promise<FrameResult>;
  status(): ModelStatus;
  configure(settings: VisionSettings): Promise<void>;
  dispose(): Promise<void>;
  subscribeStatus?(listener: (status: ModelStatus) => void): () => void;
}

export function emptyFrameResult(modelId: string, timestamp: number, warning?: string): FrameResult {
  return {
    faces: [],
    objects: [],
    modelId,
    inferenceStartedAt: timestamp,
    inferenceFinishedAt: timestamp,
    warnings: warning ? [warning] : [],
  };
}

export type { BoundingBox };
