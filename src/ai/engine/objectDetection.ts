import { validateBoundingBox } from "../../data/migrations";
import type { ObjectResult } from "../../types/vision";

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

export function getInputDimensions(input: ImageBitmap | HTMLVideoElement): { width: number; height: number } {
  const video = input as HTMLVideoElement;
  const width = "videoWidth" in input ? video.videoWidth : input.width;
  const height = "videoHeight" in input ? video.videoHeight : input.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Vision frame has no readable dimensions.");
  }
  return { width, height };
}

export function toCocoInput(
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

export function makeNormalizedBox(
  values: number[] | undefined,
  inputWidth: number,
  inputHeight: number,
  normalized: boolean,
) {
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

export function mapObjects(outputs: ObjectDetectionOutput[] | undefined, width: number, height: number): ObjectResult[] {
  const objects: ObjectResult[] = [];
  for (const output of outputs ?? []) {
    const className = typeof output.class === "string" ? output.class.trim().toLowerCase() : "";
    if (className === "person") continue;
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
