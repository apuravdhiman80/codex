import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import type { VisionSettings } from "../../types/vision";
import { ObjectDetectionEngine } from "../engine/objectEngine";
import type { FrameResult, ModelStatus, VisionEngine } from "../engine/types";

type RequestType = "initialize" | "detect" | "configure" | "dispose";
type PendingRequest = { resolve: (value: FrameResult | void) => void; reject: (error: Error) => void };

export class ObjectDetectionWorkerEngine implements VisionEngine {
  private readonly worker: Worker;
  private settings: VisionSettings;
  private inference?: Promise<FrameResult>;
  private sequence = 0;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listeners = new Set<(status: ModelStatus) => void>();
  private currentStatus: ModelStatus = { state: "idle", message: "Object detection worker is stopped.", progress: 0, activeModels: [] };

  constructor(worker: Worker, settings: VisionSettings = DEFAULT_VISION_SETTINGS) {
    this.worker = worker;
    this.settings = settings;
    worker.addEventListener("message", (event: MessageEvent) => this.handleMessage(event.data));
    worker.addEventListener("error", () => this.failPending(new Error("The object detection worker stopped unexpectedly.")));
    worker.addEventListener("messageerror", () => this.failPending(new Error("An object detection result could not be transferred from the worker.")));
  }

  initialize(): Promise<void> {
    return this.request("initialize", { settings: this.settings }).then(() => undefined);
  }

  detect(input: ImageBitmap | HTMLVideoElement): Promise<FrameResult> {
    if (this.inference) return this.inference;
    const current = this.performDetection(input).finally(() => {
      if (this.inference === current) this.inference = undefined;
    });
    this.inference = current;
    return current;
  }

  private async performDetection(input: ImageBitmap | HTMLVideoElement): Promise<FrameResult> {
    const video = input as HTMLVideoElement;
    const width = "videoWidth" in input ? video.videoWidth : input.width;
    const height = "videoHeight" in input ? video.videoHeight : input.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error("Object frame has no readable dimensions.");
    }
    const scale = Math.min(1, this.settings.maxInputWidth / width, this.settings.maxInputHeight / height);
    const options = scale < 1
      ? { resizeWidth: Math.max(1, Math.floor(width * scale)), resizeHeight: Math.max(1, Math.floor(height * scale)), resizeQuality: "high" as const }
      : undefined;
    const bitmap = options ? await createImageBitmap(input, options) : await createImageBitmap(input);
    const id = ++this.sequence;
    const result = new Promise<FrameResult>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => value ? resolve(value) : reject(new Error("Object worker returned no frame result.")), reject });
    });
    try {
      this.worker.postMessage({ id, type: "detect", bitmap }, [bitmap]);
    } catch (error) {
      this.pending.delete(id);
      bitmap.close();
      throw error;
    }
    return result;
  }

  status(): ModelStatus {
    return { ...this.currentStatus, activeModels: [...this.currentStatus.activeModels] };
  }

  subscribeStatus(listener: (status: ModelStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  configure(settings: VisionSettings): Promise<void> {
    return this.request("configure", { settings }).then(() => {
      this.settings = settings;
    });
  }

  async dispose(): Promise<void> {
    try {
      await this.inference?.catch(() => undefined);
      await this.request("dispose");
    } finally {
      this.worker.terminate();
      this.failPending(new Error("The object detection worker was stopped."));
      this.currentStatus = { state: "idle", message: "Object detection worker is stopped.", progress: 0, activeModels: [] };
      this.listeners.forEach((listener) => listener(this.status()));
    }
  }

  similarity(): number {
    throw new Error("Face matching is not available in object-only mode.");
  }

  private request(type: RequestType, data: Record<string, unknown> = {}): Promise<FrameResult | void> {
    const id = ++this.sequence;
    const promise = new Promise<FrameResult | void>((resolve, reject) => this.pending.set(id, { resolve, reject }));
    try {
      this.worker.postMessage({ id, type, ...data });
    } catch (error) {
      this.pending.delete(id);
      throw error;
    }
    return promise;
  }

  private handleMessage(message: { id: number; type: "status" | "result" | "error"; status?: ModelStatus; result?: FrameResult; message?: string }): void {
    if (message.type === "status" && message.status) {
      this.currentStatus = message.status;
      this.listeners.forEach((listener) => listener(this.status()));
      return;
    }
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.type === "error") pending.reject(new Error(message.message ?? "Object detection worker failed."));
    else pending.resolve(message.result);
  }

  private failPending(error: Error): void {
    this.pending.forEach(({ reject }) => reject(error));
    this.pending.clear();
  }
}

export function createObjectDetectionEngine(settings: VisionSettings = DEFAULT_VISION_SETTINGS): VisionEngine {
  const workerSupported = typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";
  if (workerSupported) {
    try {
      const worker = new Worker(new URL("./objectInference.worker.ts", import.meta.url), { type: "module", name: "local-object-detector" });
      return new ObjectDetectionWorkerEngine(worker, settings);
    } catch {
      // Main-thread inference remains available when worker creation is blocked.
    }
  }
  return new ObjectDetectionEngine(undefined, settings);
}
