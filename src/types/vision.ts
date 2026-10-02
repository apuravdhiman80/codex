export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
  name?: string;
}

export interface FaceResult {
  box: BoundingBox;
  detectorConfidence: number;
  landmarks?: FaceLandmark[];
  descriptor?: Float32Array;
}

export interface ObjectResult {
  box: BoundingBox;
  className: string;
  modelClassId: number;
  detectorConfidence: number;
}

export type VisionMode = "fusion" | "objects" | "recognition";

export interface FaceQualitySettings {
  minSizeRatio: number;
  minBrightness: number;
  maxBrightness: number;
  minSharpness: number;
  maxYawDegrees: number;
  maxPitchDegrees: number;
}

export interface OverlaySettings {
  faces: boolean;
  objects: boolean;
  landmarks: boolean;
}

export type CameraFacingMode = "user" | "environment";
export type ModelVariant = "performance" | "balanced" | "quality";
export type ThemeMode = "dark" | "light" | "system";

export interface VisionSettings {
  objectThreshold: number;
  recognitionThreshold: number;
  unknownMatchMargin: number;
  maxEnrollmentSamples: number;
  faceQuality: FaceQualitySettings;
  maxInputWidth: number;
  maxInputHeight: number;
  inferenceIntervalMs: number;
  trackExpiryMs: number;
  cameraId: string | null;
  cameraFacingMode: CameraFacingMode;
  modelVariant: ModelVariant;
  overlays: OverlaySettings;
  theme: ThemeMode;
  eventRetentionDays: number;
}

export interface PersistedVisionSettings extends VisionSettings {
  id: "current";
}
