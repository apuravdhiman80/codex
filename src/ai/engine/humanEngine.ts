import type { Config as HumanConfig, Human } from "@vladmandic/human";
import type { VisionSettings } from "../../types/vision";
import { DEFAULT_VISION_SETTINGS, normalizeVisionSettings, VISION_CONFIG } from "../../config/vision";
import { validateBoundingBox } from "../../data/migrations";
import {
  getModelBaseUrl,
  getObjectModelUrl,
  getWasmBaseUrl,
  MODEL_ID,
} from "./modelManifest";
import type { FrameResult, ModelStatus, VisionEngine } from "./types";

interface HumanFaceOutput {
  box?: number[];
  boxRaw?: number[];
  boxScore?: number;
  meshRaw?: number[][];
  embedding?: number[] | null;
}

interface HumanResultOutput {
  face?: HumanFaceOutput[];
  error?: string | null;
}

export interface HumanRuntime {
  load(): Promise<void>;
  warmup?(): Promise<unknown>;
  detect(input: ImageBitmap | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas): Promise<HumanResultOutput>;
  reset?(): void;
  match?: {
    similarity(first: number[], second: number[]): number;
  };
  backend?: "webgl" | "wasm" | "cpu";
}

export interface ObjectDetectionOutput {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export interface ObjectDetectorRuntime {
  detect(
    input: HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas,
    maxNumBoxes: number,
    minScore: number,
  ): Promise<ObjectDetectionOutput[]>;
  dispose?(): void;
  backend?: "webgl" | "wasm" | "cpu";
}

export interface EngineDependencies {
  createHuman(config: Partial<HumanConfig>): Promise<HumanRuntime> | HumanRuntime;
  loadObjectDetector(modelUrl: string, wasmBaseUrl: string): Promise<ObjectDetectorRuntime>;
  now(): number;
}

const COCO_CLASS_LABELS = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
  "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
  "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
  "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard",
  "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors",
  "teddy bear", "hair drier", "toothbrush",
] as const;
const COCO_CLASS_IDS = new Map<string, number>(COCO_CLASS_LABELS.map((label, index) => [label, index]));

export function buildHumanConfig(modelBasePath: string, backend: "webgl" | "wasm" | "cpu" = "webgl"): Partial<HumanConfig> {
  return {
    backend,
    debug: false,
    modelBasePath,
    wasmPath: modelBasePath.replace(/human\/?$/u, "tfjs-wasm/"),
    cacheModels: false,
    async: true,
    face: {
      enabled: true,
      detector: {
        enabled: true,
        modelPath: "blazeface",
        maxDetected: VISION_CONFIG.maxDetectedFaces,
        minConfidence: VISION_CONFIG.faceDetectionThreshold,
        rotation: true,
        return: false,
      },
      mesh: { enabled: true, modelPath: "facemesh" },
      description: { enabled: true, modelPath: "faceres" },
      attention: { enabled: false },
      iris: { enabled: false },
      emotion: { enabled: false },
      antispoof: { enabled: false },
      liveness: { enabled: false },
      gear: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    segmentation: { enabled: false },
    gesture: { enabled: false },
  };
}

function defaultDependencies(): EngineDependencies {
  return {
    now: () => performance.now(),
    createHuman: async (config) => {
      const library = await import("@vladmandic/human");
      let selectedBackend = (config.backend ?? "webgl") as "webgl" | "wasm" | "cpu";
      let runtime: Human = new library.Human(config);
      return {
        get backend() {
          return selectedBackend as "webgl" | "wasm";
        },
        load: async () => {
          const backends = selectedBackend === "webgl" ? ["webgl", "wasm", "cpu"] as const : [selectedBackend];
          let lastError: unknown;
          for (const backend of backends) {
            runtime = new library.Human({ ...config, backend });
            selectedBackend = backend;
            try {
              await runtime.load();
              return;
            } catch (error) {
              lastError = error;
              runtime.reset();
            }
          }
          throw lastError ?? new Error("No supported face model backend is available.");
        },
        warmup: async () => {
          if (selectedBackend === "webgl") await runtime.warmup();
        },
        detect: async (input) => runtime.detect(input) as Promise<HumanResultOutput>,
        match: runtime.match,
        reset: () => runtime.reset(),
      };
    },
    loadObjectDetector: async (modelUrl, wasmBaseUrl) => {
      const tf = await import("@tensorflow/tfjs-core");
      let backend: "webgl" | "wasm" | "cpu" = "webgl";
      await import("@tensorflow/tfjs-backend-webgl");
      try {
        const ready = await tf.setBackend("webgl");
        if (!ready) throw new Error("WebGL backend is unavailable");
        await tf.ready();
      } catch {
        try {
          const wasm = await import("@tensorflow/tfjs-backend-wasm");
          wasm.setWasmPaths(wasmBaseUrl);
          const ready = await tf.setBackend("wasm");
          if (!ready) throw new Error("WASM backend is unavailable");
          backend = "wasm";
          await tf.ready();
        } catch {
          await import("@tensorflow/tfjs-backend-cpu");
          const ready = await tf.setBackend("cpu");
          if (!ready) throw new Error("No supported TensorFlow.js backend is available");
          backend = "cpu";
          await tf.ready();
        }
      }
      const coco = await import("@tensorflow-models/coco-ssd");
      const model = await coco.load({ base: "lite_mobilenet_v2", modelUrl });
      return {
        backend,
        detect: (input, maxNumBoxes, minScore) => model.detect(input as HTMLVideoElement, maxNumBoxes, minScore),
        dispose: () => model.dispose(),
      };
    },
  };
}

function getDimensions(input: ImageBitmap | HTMLVideoElement): { width: number; height: number } {
  const video = input as HTMLVideoElement;
  const width = "videoWidth" in input ? video.videoWidth : input.width;
  const height = "videoHeight" in input ? video.videoHeight : input.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Vision frame has no readable dimensions.");
  }
  return { width, height };
}

function toCocoInput(
  input: ImageBitmap | HTMLVideoElement,
  width: number,
  height: number,
): HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas {
  if ("videoWidth" in input) return input as HTMLVideoElement;
  const bitmap = input as ImageBitmap;
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("A canvas is required to process the current frame.");
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A canvas is required to process the current frame.");
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function makeNormalizedBox(values: number[] | undefined, inputWidth: number, inputHeight: number, normalized: boolean) {
  if (!values || values.length < 4 || values.slice(0, 4).some((value) => !Number.isFinite(value))) return undefined;
  const divisorX = normalized ? 1 : inputWidth;
  const divisorY = normalized ? 1 : inputHeight;
  const rawX = values[0] / divisorX;
  const rawY = values[1] / divisorY;
  const rawWidth = values[2] / divisorX;
  const rawHeight = values[3] / divisorY;
  const x = Math.max(0, Math.min(1, rawX));
  const y = Math.max(0, Math.min(1, rawY));
  const right = Math.max(x, Math.min(1, rawX + rawWidth));
  const bottom = Math.max(y, Math.min(1, rawY + rawHeight));
  if (right <= x || bottom <= y) return undefined;
  try {
    return validateBoundingBox({
      x,
      y,
      width: x === rawX && right === rawX + rawWidth ? rawWidth : right - x,
      height: y === rawY && bottom === rawY + rawHeight ? rawHeight : bottom - y,
    });
  } catch {
    return undefined;
  }
}

function mapFaces(faceOutputs: HumanFaceOutput[] | undefined, width: number, height: number) {
  const faces = [];
  for (const face of faceOutputs ?? []) {
    const box = makeNormalizedBox(face.boxRaw ?? face.box, width, height, face.boxRaw !== undefined);
    const confidence = face.boxScore;
    if (!box || typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) continue;
    const descriptor = Array.isArray(face.embedding) && face.embedding.length === 1024 && face.embedding.every(Number.isFinite)
      ? new Float32Array(face.embedding)
      : undefined;
    const landmarks = Array.isArray(face.meshRaw)
      ? face.meshRaw.flatMap((point) => {
        if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return [];
        return [{ x: point[0], y: point[1], ...(Number.isFinite(point[2]) ? { z: point[2] } : {}) }];
      })
      : undefined;
    faces.push({
      box,
      detectorConfidence: confidence,
      ...(landmarks?.length ? { landmarks } : {}),
      ...(descriptor ? { descriptor } : {}),
    });
  }
  return faces;
}

function mapObjects(outputs: ObjectDetectionOutput[] | undefined, width: number, height: number) {
  const objects = [];
  for (const output of outputs ?? []) {
    const className = typeof output.class === "string" ? output.class.trim().toLowerCase() : "";
    const modelClassId = COCO_CLASS_IDS.get(className);
    const confidence = output.score;
    const box = makeNormalizedBox(output.bbox, width, height, false);
    if (
      modelClassId === undefined ||
      !box ||
      typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    ) continue;
    objects.push({ box, className, modelClassId, detectorConfidence: confidence });
  }
  return objects;
}

export class HumanVisionEngine implements VisionEngine {
  private readonly dependencies: EngineDependencies;
  private settings: VisionSettings;
  private human?: HumanRuntime;
  private objectDetector?: ObjectDetectorRuntime;
  private initialization?: Promise<void>;
  private inference?: Promise<FrameResult>;
  private readonly statusListeners = new Set<(status: ModelStatus) => void>();
  private currentStatus: ModelStatus = {
    state: "idle",
    message: "Vision models are not loaded.",
    progress: 0,
    activeModels: [],
  };

  constructor(
    dependencies: EngineDependencies = defaultDependencies(),
    settings: VisionSettings = DEFAULT_VISION_SETTINGS,
  ) {
    this.dependencies = dependencies;
    this.settings = normalizeVisionSettings(settings);
  }

  initialize(): Promise<void> {
    if (this.currentStatus.state === "ready" || this.currentStatus.state === "slow") return Promise.resolve();
    if (this.initialization) return this.initialization;
    this.setStatus({ state: "loading", message: "Loading face and object models…", progress: 0.1, activeModels: [] });
    this.initialization = this.initializeModels().catch(async (error: unknown) => {
      this.human?.reset?.();
      this.objectDetector?.dispose?.();
      this.human = undefined;
      this.objectDetector = undefined;
      this.setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Vision models could not be initialized.",
        progress: 0,
        activeModels: [],
      });
      throw error;
    }).finally(() => {
      this.initialization = undefined;
    });
    return this.initialization;
  }

  private async initializeModels(): Promise<void> {
    const origin = typeof location !== "undefined" ? location.origin : "http://localhost";
    const humanConfig = buildHumanConfig(getModelBaseUrl(origin));
    this.human = await this.dependencies.createHuman(humanConfig);
    await this.human.load();
    if (this.human.backend === "webgl") await this.human.warmup?.();
    this.setStatus({
      state: "loading",
      message: "Face model ready. Loading COCO object classes…",
      backend: this.human.backend,
      progress: 0.6,
      activeModels: ["BlazeFace", "FaceMesh", "FaceRes"],
    });
    this.objectDetector = await this.dependencies.loadObjectDetector(
      getObjectModelUrl(origin),
      getWasmBaseUrl(origin),
    );
    const backend = this.human.backend === "cpu" || this.objectDetector.backend === "cpu"
      ? "cpu"
      : this.objectDetector.backend ?? this.human.backend ?? "unknown";
    const slow = backend === "cpu";
    this.setStatus({
      state: slow ? "slow" : "ready",
      message: slow ? "Models are ready using CPU inference; processing may be slower." : "Face and object models are ready.",
      backend,
      progress: 1,
      activeModels: ["BlazeFace", "FaceMesh", "FaceRes", "COCO SSD Lite"],
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
      throw new Error("Vision models are not ready. Initialize the engine and retry.");
    }
    const human = this.human;
    const objects = this.objectDetector;
    if (!human || !objects) throw new Error("Vision model adapter is incomplete.");
    const inferenceStartedAt = this.dependencies.now();
    const { width, height } = getDimensions(input);
    const faceOutput = await human.detect(input);
    const objectOutput = await objects.detect(toCocoInput(input, width, height), VISION_CONFIG.maxDetectedObjects, this.settings.objectThreshold);
    const inferenceFinishedAt = this.dependencies.now();
    return {
      faces: mapFaces(faceOutput.face, width, height),
      objects: mapObjects(objectOutput, width, height),
      modelId: MODEL_ID,
      inferenceStartedAt,
      inferenceFinishedAt,
      warnings: faceOutput.error ? [faceOutput.error] : [],
    };
  }

  status(): ModelStatus {
    return { ...this.currentStatus, activeModels: [...this.currentStatus.activeModels] };
  }

  subscribeStatus(listener: (status: ModelStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  async configure(settings: VisionSettings): Promise<void> {
    this.settings = normalizeVisionSettings(settings);
  }

  async dispose(): Promise<void> {
    if (this.inference) await this.inference.catch(() => undefined);
    this.human?.reset?.();
    this.objectDetector?.dispose?.();
    this.human = undefined;
    this.objectDetector = undefined;
    this.setStatus({ state: "idle", message: "Vision models are stopped.", progress: 0, activeModels: [] });
  }

  similarity(first: Float32Array, second: Float32Array): number {
    if (!this.human?.match) throw new Error("Face similarity matching is unavailable until the model is loaded.");
    return this.human.match.similarity(Array.from(first), Array.from(second));
  }

  private setStatus(status: ModelStatus): void {
    this.currentStatus = status;
    const snapshot = this.status();
    this.statusListeners.forEach((listener) => listener(snapshot));
  }
}
