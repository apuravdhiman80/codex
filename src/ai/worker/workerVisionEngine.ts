import type { VisionSettings } from "../../types/vision";
import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import { HumanVisionEngine } from "../engine/humanEngine";
import type { FrameResult, ModelStatus, VisionEngine } from "../engine/types";

type RequestType = "initialize" | "detect" | "configure" | "dispose";
type PendingRequest = { resolve: (value: FrameResult | void) => void; reject: (error: Error) => void };

export class WorkerVisionEngine implements VisionEngine {
  private readonly worker: Worker;
  private settings: VisionSettings;
  private inference?: Promise<FrameResult>;
  private sequence = 0;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listeners = new Set<(status: ModelStatus) => void>();
  private currentStatus: ModelStatus = { state: "idle", message: "Vision worker is stopped.", progress: 0, activeModels: [] };

  constructor(worker: Worker, settings: VisionSettings = DEFAULT_VISION_SETTINGS) {
    this.worker = worker;
    this.settings = settings;
    worker.addEventListener("message", (event: MessageEvent) => this.handleMessage(event.data));
    worker.addEventListener("error", () => this.failPending(new Error("The vision worker stopped unexpectedly.")));
    worker.addEventListener("messageerror", () => this.failPending(new Error("A vision result could not be transferred from the worker.")));
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
    const source = input as HTMLVideoElement;
    const width = "videoWidth" in input ? source.videoWidth : input.width;
    const height = "videoHeight" in input ? source.videoHeight : input.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error("Vision frame has no readable dimensions.");
    }
    const scale = Math.min(1, this.settings.maxInputWidth / width, this.settings.maxInputHeight / height);
    const options = scale < 1
      ? { resizeWidth: Math.max(1, Math.floor(width * scale)), resizeHeight: Math.max(1, Math.floor(height * scale)), resizeQuality: "high" as const }
      : undefined;
    const bitmap = options ? await createImageBitmap(input, options) : await createImageBitmap(input);
    const id = ++this.sequence;
    const result = new Promise<FrameResult>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => value ? resolve(value) : reject(new Error("Worker returned no frame result.")), reject });
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

  similarity(first: Float32Array, second: Float32Array): number {
    if (first.length !== second.length || first.length !== 1024 || !first.every(Number.isFinite) || !second.every(Number.isFinite)) {
      throw new Error("Face descriptors are incompatible.");
    }
    let squaredDistance = 0;
    for (let index = 0; index < first.length; index += 1) {
      const difference = first[index]! - second[index]!;
      squaredDistance += difference * difference;
    }
    // Matches Human 3.3.6 match.similarity defaults (order=2, multiplier=25, range=.2..8).
    const distance = Math.round(100 * 25 * squaredDistance) / 100;
    if (distance === 0) return 1;
    const normalized = (1 - Math.sqrt(distance) / 100 - 0.2) / (0.8 - 0.2);
    return Math.round(100 * Math.max(0, Math.min(1, normalized))) / 100;
  }

  async dispose(): Promise<void> {
    try {
      await this.inference?.catch(() => undefined);
      await this.request("dispose");
    } finally {
      this.worker.terminate();
      this.failPending(new Error("Vision worker was stopped."));
      this.currentStatus = { state: "idle", message: "Vision worker is stopped.", progress: 0, activeModels: [] };
      this.listeners.forEach((listener) => listener(this.status()));
    }
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
    if (message.type === "error") pending.reject(new Error(message.message ?? "Vision worker failed."));
    else pending.resolve(message.result);
  }

  private failPending(error: Error): void {
    this.pending.forEach(({ reject }) => reject(error));
    this.pending.clear();
  }
}

export function createVisionEngine(settings: VisionSettings): VisionEngine {
  const workerSupported = typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";
  if (workerSupported) {
    try {
      const worker = new Worker(new URL("./inference.worker.ts", import.meta.url), { type: "module", name: "visionid-inference" });
      return new WorkerVisionEngine(worker, settings);
    } catch {
      // Worker construction can be blocked by browser policy; main-thread inference remains supported.
    }
  }
  return new HumanVisionEngine(undefined, settings);
}
