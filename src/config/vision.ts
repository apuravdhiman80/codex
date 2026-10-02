import type {
  CameraFacingMode,
  ModelVariant,
  ThemeMode,
  VisionSettings,
} from "../types/vision";

export const VISION_CONFIG = {
  qrPayloadMaxBytes: 8192,
  faceDescriptorLength: 1024,
  faceDetectionThreshold: 0.35,
  maxDetectedFaces: 8,
  maxDetectedObjects: 30,
  maxMetadataBytes: 2048,
  maxEnrollmentSamples: 5,
} as const;

export const DEFAULT_VISION_SETTINGS: VisionSettings = {
  objectThreshold: 0.5,
  recognitionThreshold: 0.62,
  unknownMatchMargin: 0.05,
  maxEnrollmentSamples: 5,
  faceQuality: {
    minSizeRatio: 0.12,
    minBrightness: 40,
    maxBrightness: 220,
    minSharpness: 30,
    maxYawDegrees: 25,
    maxPitchDegrees: 25,
  },
  maxInputWidth: 640,
  maxInputHeight: 480,
  inferenceIntervalMs: 180,
  trackExpiryMs: 1800,
  cameraId: null,
  cameraFacingMode: "user",
  modelVariant: "balanced",
  overlays: { faces: true, objects: true, landmarks: false },
  theme: "dark",
  eventRetentionDays: 90,
};

export class SettingsValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "SettingsValidationError";
    this.field = field;
  }
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, field: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SettingsValidationError(field, "must be an object");
  }
  return value as UnknownRecord;
}

function boundedNumber(
  input: unknown,
  fallback: number,
  min: number,
  max: number,
  field: string,
  integer = false,
): number {
  if (input === undefined) return fallback;
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new SettingsValidationError(field, "must be a finite number");
  }
  if (integer && !Number.isInteger(input)) {
    throw new SettingsValidationError(field, "must be an integer");
  }
  const clamped = Math.max(min, Math.min(max, input));
  return integer ? Math.round(clamped) : clamped;
}

function oneOf<T extends string>(
  input: unknown,
  fallback: T,
  values: readonly T[],
  field: string,
): T {
  if (input === undefined) return fallback;
  if (typeof input !== "string" || !values.includes(input as T)) {
    throw new SettingsValidationError(field, `must be one of ${values.join(", ")}`);
  }
  return input as T;
}

function booleanValue(input: unknown, fallback: boolean, field: string): boolean {
  if (input === undefined) return fallback;
  if (typeof input !== "boolean") {
    throw new SettingsValidationError(field, "must be true or false");
  }
  return input;
}

export function normalizeVisionSettings(input: unknown): VisionSettings {
  const value = input === undefined ? {} : record(input, "settings");
  const qualityInput = value.faceQuality === undefined
    ? {}
    : record(value.faceQuality, "faceQuality");
  const overlayInput = value.overlays === undefined
    ? {}
    : record(value.overlays, "overlays");

  let cameraId: string | null = DEFAULT_VISION_SETTINGS.cameraId;
  if (value.cameraId !== undefined) {
    if (value.cameraId !== null && typeof value.cameraId !== "string") {
      throw new SettingsValidationError("cameraId", "must be a string or null");
    }
    if (typeof value.cameraId === "string" && value.cameraId.length > 256) {
      throw new SettingsValidationError("cameraId", "must be at most 256 characters");
    }
    cameraId = typeof value.cameraId === "string" ? value.cameraId : null;
  }

  const minBrightness = boundedNumber(
    qualityInput.minBrightness,
    DEFAULT_VISION_SETTINGS.faceQuality.minBrightness,
    0,
    254,
    "faceQuality.minBrightness",
    true,
  );
  const maxBrightness = boundedNumber(
    qualityInput.maxBrightness,
    DEFAULT_VISION_SETTINGS.faceQuality.maxBrightness,
    1,
    255,
    "faceQuality.maxBrightness",
    true,
  );
  if (minBrightness >= maxBrightness) {
    throw new SettingsValidationError(
      "faceQuality",
      "minimum brightness must be below maximum brightness",
    );
  }

  return {
    objectThreshold: boundedNumber(value.objectThreshold, 0.5, 0.1, 0.99, "objectThreshold"),
    recognitionThreshold: boundedNumber(
      value.recognitionThreshold,
      0.62,
      0.4,
      0.9,
      "recognitionThreshold",
    ),
    unknownMatchMargin: boundedNumber(value.unknownMatchMargin, 0.05, 0.01, 0.2, "unknownMatchMargin"),
    maxEnrollmentSamples: boundedNumber(
      value.maxEnrollmentSamples,
      DEFAULT_VISION_SETTINGS.maxEnrollmentSamples,
      3,
      VISION_CONFIG.maxEnrollmentSamples,
      "maxEnrollmentSamples",
      true,
    ),
    faceQuality: {
      minSizeRatio: boundedNumber(qualityInput.minSizeRatio, 0.12, 0.05, 0.8, "faceQuality.minSizeRatio"),
      minBrightness,
      maxBrightness,
      minSharpness: boundedNumber(
        qualityInput.minSharpness,
        DEFAULT_VISION_SETTINGS.faceQuality.minSharpness,
        0,
        255,
        "faceQuality.minSharpness",
      ),
      maxYawDegrees: boundedNumber(
        qualityInput.maxYawDegrees,
        DEFAULT_VISION_SETTINGS.faceQuality.maxYawDegrees,
        5,
        60,
        "faceQuality.maxYawDegrees",
      ),
      maxPitchDegrees: boundedNumber(
        qualityInput.maxPitchDegrees,
        DEFAULT_VISION_SETTINGS.faceQuality.maxPitchDegrees,
        5,
        60,
        "faceQuality.maxPitchDegrees",
      ),
    },
    maxInputWidth: boundedNumber(value.maxInputWidth, 640, 160, 1280, "maxInputWidth", true),
    maxInputHeight: boundedNumber(value.maxInputHeight, 480, 120, 960, "maxInputHeight", true),
    inferenceIntervalMs: boundedNumber(
      value.inferenceIntervalMs,
      180,
      80,
      2000,
      "inferenceIntervalMs",
      true,
    ),
    trackExpiryMs: boundedNumber(value.trackExpiryMs, 1800, 250, 10000, "trackExpiryMs", true),
    cameraId,
    cameraFacingMode: oneOf<CameraFacingMode>(
      value.cameraFacingMode,
      "user",
      ["user", "environment"],
      "cameraFacingMode",
    ),
    modelVariant: oneOf<ModelVariant>(
      value.modelVariant,
      "balanced",
      ["performance", "balanced", "quality"],
      "modelVariant",
    ),
    overlays: {
      faces: booleanValue(overlayInput.faces, true, "overlays.faces"),
      objects: booleanValue(overlayInput.objects, true, "overlays.objects"),
      landmarks: booleanValue(overlayInput.landmarks, false, "overlays.landmarks"),
    },
    theme: oneOf<ThemeMode>(value.theme, "dark", ["dark", "light", "system"], "theme"),
    eventRetentionDays: boundedNumber(value.eventRetentionDays, 90, 0, 365, "eventRetentionDays", true),
  };
}

/** Convert pre-v1 settings records to the current validated shape. */
export function migrateLegacySettings(input: unknown): VisionSettings {
  let legacy = record(input, "legacy settings");
  if (typeof legacy.settings === "object" && legacy.settings !== null) {
    legacy = legacy.settings as UnknownRecord;
  } else if (typeof legacy.value === "object" && legacy.value !== null) {
    legacy = legacy.value as UnknownRecord;
  }
  const mapped: UnknownRecord = { ...legacy };
  if (mapped.objectThreshold === undefined && mapped.detectionThreshold !== undefined) {
    mapped.objectThreshold = mapped.detectionThreshold;
  }
  return normalizeVisionSettings(mapped);
}
