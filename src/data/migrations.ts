import { DEFAULT_VISION_SETTINGS, migrateLegacySettings, VISION_CONFIG } from "../config/vision";
import type { DetectionEvent, NewDetectionEvent } from "../types/events";
import type { FaceTemplate } from "../types/person";
import type { BoundingBox, PersistedVisionSettings, VisionSettings } from "../types/vision";

export const CURRENT_SCHEMA_VERSION = 2;
export const FACE_DESCRIPTOR_LENGTH = VISION_CONFIG.faceDescriptorLength;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be a finite number from ${min} to ${max}`);
  }
  return value;
}

export function validateFaceTemplate(input: unknown): FaceTemplate {
  if (!isRecord(input)) throw new Error("Face template must be an object");
  const descriptor = input.descriptor;
  if (!(descriptor instanceof Float32Array) || descriptor.length !== FACE_DESCRIPTOR_LENGTH) {
    throw new Error(`Face descriptor must contain ${FACE_DESCRIPTOR_LENGTH} float values`);
  }
  for (const value of descriptor) {
    if (!Number.isFinite(value)) throw new Error("Face descriptor contains an invalid value");
  }
  if (typeof input.id !== "string" || input.id.length < 1 || input.id.length > 128) {
    throw new Error("Face template id is invalid");
  }
  if (typeof input.personId !== "string" || input.personId.length < 1 || input.personId.length > 128) {
    throw new Error("Face template person id is invalid");
  }
  if (typeof input.modelId !== "string" || input.modelId.trim().length < 1 || input.modelId.length > 128) {
    throw new Error("Face template model id is invalid");
  }
  if (typeof input.pose !== "string" || input.pose.trim().length < 1 || input.pose.length > 40) {
    throw new Error("Face template pose is invalid");
  }
  if (typeof input.createdAt !== "number" || !Number.isFinite(input.createdAt) || input.createdAt <= 0) {
    throw new Error("Face template timestamp is invalid");
  }
  if (input.isDemo !== false) {
    throw new Error("Demo profiles cannot contain face templates");
  }
  return {
    id: input.id,
    personId: input.personId,
    descriptor: new Float32Array(descriptor),
    quality: finiteNumber(input.quality, "Face template quality", 0, 1),
    pose: input.pose,
    createdAt: input.createdAt,
    modelId: input.modelId.trim(),
    isDemo: false,
  };
}

export function validateBoundingBox(input: unknown): BoundingBox {
  if (!isRecord(input)) throw new Error("Bounding box must be an object");
  return {
    x: finiteNumber(input.x, "Bounding box x", 0, 1),
    y: finiteNumber(input.y, "Bounding box y", 0, 1),
    width: finiteNumber(input.width, "Bounding box width", 0, 1),
    height: finiteNumber(input.height, "Bounding box height", 0, 1),
  };
}

export function validateDetectionEvent(
  input: NewDetectionEvent | DetectionEvent,
): DetectionEvent {
  const value = input as unknown as Record<string, unknown>;
  const validTypes = ["face_detected", "person_recognized", "unknown_face", "object_detected"];
  const validModes = ["fusion", "objects", "recognition"];
  if (!validTypes.includes(String(value.type))) throw new Error("Detection event type is invalid");
  if (!validModes.includes(String(value.mode))) throw new Error("Detection event mode is invalid");
  if (typeof value.label !== "string" || !value.label.trim() || value.label.length > 160) {
    throw new Error("Detection event label is invalid");
  }
  const timestamp = finiteNumber(value.timestamp, "Detection event timestamp", 1, Number.MAX_SAFE_INTEGER);
  const detectorConfidence = value.detectorConfidence === undefined
    ? undefined
    : finiteNumber(value.detectorConfidence, "Detector confidence", 0, 1);
  const recognitionSimilarity = value.recognitionSimilarity === undefined
    ? undefined
    : finiteNumber(value.recognitionSimilarity, "Recognition similarity", 0, 1);
  if (value.type === "person_recognized" && (!value.personId || recognitionSimilarity === undefined)) {
    throw new Error("Recognized person events require a profile and recognition similarity");
  }
  if (value.type === "object_detected" && detectorConfidence === undefined) {
    throw new Error("Object events require detector confidence");
  }
  if (value.personId !== undefined && (typeof value.personId !== "string" || value.personId.length > 128)) {
    throw new Error("Detection event person id is invalid");
  }
  if (value.trackId !== undefined && (typeof value.trackId !== "string" || value.trackId.length > 64)) {
    throw new Error("Detection event track id is invalid");
  }
  return {
    id: typeof value.id === "string" && value.id.length > 0 ? value.id : crypto.randomUUID(),
    timestamp,
    type: value.type as DetectionEvent["type"],
    label: value.label.trim(),
    ...(value.personId ? { personId: value.personId as string } : {}),
    ...(value.trackId ? { trackId: value.trackId as string } : {}),
    ...(detectorConfidence === undefined ? {} : { detectorConfidence }),
    ...(recognitionSimilarity === undefined ? {} : { recognitionSimilarity }),
    ...(value.boundingBox === undefined ? {} : { boundingBox: validateBoundingBox(value.boundingBox) }),
    mode: value.mode as DetectionEvent["mode"],
    isDemo: value.isDemo === true,
  };
}

export function migrateSettingsRecord(input: unknown): PersistedVisionSettings {
  let candidate = input;
  if (isRecord(candidate) && candidate.settings !== undefined) candidate = candidate.settings;
  if (isRecord(candidate) && candidate.value !== undefined) candidate = candidate.value;
  let settings: VisionSettings;
  try {
    settings = migrateLegacySettings(candidate);
  } catch {
    // Invalid historical settings should not make all local profiles inaccessible.
    settings = { ...DEFAULT_VISION_SETTINGS, faceQuality: { ...DEFAULT_VISION_SETTINGS.faceQuality }, overlays: { ...DEFAULT_VISION_SETTINGS.overlays } };
  }
  return { id: "current", ...settings };
}
