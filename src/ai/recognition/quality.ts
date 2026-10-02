import type { FaceQualitySettings, FaceResult } from "../../types/vision";
import { VISION_CONFIG } from "../../config/vision";

export type PosePrompt = "front" | "left" | "right";
export type QualityCheckKey = "face_present" | "face_size" | "lighting" | "sharpness" | "pose";

export interface QualityConfig extends FaceQualitySettings {
  minDetectorConfidence?: number;
  minPoseAngleDegrees?: number;
}

export interface QualityCheck {
  key: QualityCheckKey;
  label: string;
  passed: boolean;
  message: string;
  value?: number;
  threshold?: number;
}

export interface QualityReport {
  ready: boolean;
  score: number;
  checks: QualityCheck[];
  guidance: string[];
}

interface FaceMeasurements {
  brightness: number;
  sharpness: number;
}

function measureFace(frame: ImageData, face: FaceResult): FaceMeasurements | undefined {
  if (!Number.isInteger(frame.width) || !Number.isInteger(frame.height) || frame.width < 3 || frame.height < 3 || frame.data.length < frame.width * frame.height * 4) return undefined;
  const { x, y, width, height } = face.box;
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return undefined;
  const left = Math.max(0, Math.floor(x * frame.width));
  const top = Math.max(0, Math.floor(y * frame.height));
  const right = Math.min(frame.width, Math.ceil((x + width) * frame.width));
  const bottom = Math.min(frame.height, Math.ceil((y + height) * frame.height));
  const regionWidth = right - left;
  const regionHeight = bottom - top;
  if (regionWidth < 3 || regionHeight < 3) return undefined;

  const stride = Math.max(1, Math.floor(Math.max(regionWidth, regionHeight) / 64));
  const columns = Math.floor((regionWidth - 1) / stride) + 1;
  const rows = Math.floor((regionHeight - 1) / stride) + 1;
  const grayscale = new Float32Array(columns * rows);
  let brightnessSum = 0;
  let samples = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const pixel = ((top + row * stride) * frame.width + left + column * stride) * 4;
      const value = 0.2126 * frame.data[pixel]! + 0.7152 * frame.data[pixel + 1]! + 0.0722 * frame.data[pixel + 2]!;
      grayscale[row * columns + column] = value;
      brightnessSum += value;
      samples += 1;
    }
  }
  let laplacianSum = 0;
  let laplacianSquareSum = 0;
  let laplacianCount = 0;
  for (let row = 1; row < rows - 1; row += 1) {
    for (let column = 1; column < columns - 1; column += 1) {
      const index = row * columns + column;
      const laplacian = 4 * grayscale[index]! - grayscale[index - 1]! - grayscale[index + 1]! - grayscale[index - columns]! - grayscale[index + columns]!;
      laplacianSum += laplacian;
      laplacianSquareSum += laplacian * laplacian;
      laplacianCount += 1;
    }
  }
  const laplacianMean = laplacianCount ? laplacianSum / laplacianCount : 0;
  const sharpness = laplacianCount ? Math.max(0, laplacianSquareSum / laplacianCount - laplacianMean * laplacianMean) : 0;
  return { brightness: brightnessSum / samples, sharpness };
}

function makeCheck(
  key: QualityCheckKey,
  label: string,
  passed: boolean,
  message: string,
  value?: number,
  threshold?: number,
): QualityCheck {
  return { key, label, passed, message, ...(value === undefined ? {} : { value }), ...(threshold === undefined ? {} : { threshold }) };
}

export function assessFaceQuality(
  face: FaceResult,
  frame: ImageData,
  prompt: PosePrompt,
  config: QualityConfig,
): QualityReport {
  const faceFound = face.detectorConfidence >= (config.minDetectorConfidence ?? VISION_CONFIG.minimumQualityDetectorConfidence);
  const measurements = faceFound ? measureFace(frame, face) : undefined;
  const sizeRatio = frame.width > 0 && frame.height > 0
    ? Math.min(face.box.width * frame.width, face.box.height * frame.height) / Math.min(frame.width, frame.height)
    : 0;
  const regionReady = measurements !== undefined;
  const brightness = measurements?.brightness;
  const sharpness = measurements?.sharpness;
  const pose = face.pose;
  const yawDegrees = pose ? pose.yaw * 180 / Math.PI : undefined;
  const pitchDegrees = pose ? pose.pitch * 180 / Math.PI : undefined;
  const maxYaw = config.maxYawDegrees;
  const maxPitch = config.maxPitchDegrees;
  const sidePromptAngle = config.minPoseAngleDegrees ?? VISION_CONFIG.minimumPoseTurnDegrees;
  const directionMatches = prompt === "front"
    ? yawDegrees !== undefined && Math.abs(yawDegrees) <= maxYaw
    : prompt === "left"
      ? yawDegrees !== undefined && yawDegrees <= -sidePromptAngle && yawDegrees >= -maxYaw
      : yawDegrees !== undefined && yawDegrees >= sidePromptAngle && yawDegrees <= maxYaw;
  const posePasses = directionMatches && pitchDegrees !== undefined && Math.abs(pitchDegrees) <= maxPitch;

  const checks: QualityCheck[] = [
    makeCheck("face_present", "Face detected", faceFound, faceFound ? "A face was detected." : "Move into view and face the camera.", face.detectorConfidence, config.minDetectorConfidence ?? VISION_CONFIG.minimumQualityDetectorConfidence),
    makeCheck("face_size", "Face size", regionReady && sizeRatio >= config.minSizeRatio, sizeRatio >= config.minSizeRatio ? "Face is large enough." : "Move closer so the face fills more of the frame.", sizeRatio, config.minSizeRatio),
    makeCheck(
      "lighting",
      "Lighting",
      brightness !== undefined && brightness >= config.minBrightness && brightness <= config.maxBrightness,
      brightness === undefined ? "Lighting could not be measured." : brightness < config.minBrightness ? "Add light to the face." : brightness > config.maxBrightness ? "Reduce glare or move away from strong light." : "Face lighting is in range.",
      brightness,
    ),
    makeCheck(
      "sharpness",
      "Sharpness",
      sharpness !== undefined && sharpness >= config.minSharpness,
      sharpness === undefined ? "Sharpness could not be measured." : sharpness < config.minSharpness ? "Hold still and allow the camera to focus." : "Face detail is sufficiently sharp.",
      sharpness,
      config.minSharpness,
    ),
    makeCheck(
      "pose",
      "Pose",
      posePasses,
      !pose ? "Face angle could not be measured; look toward the camera and retry." : posePasses ? `Face angle matches the ${prompt} prompt.` : `Turn your face to the ${prompt} position, keeping your chin level.`,
      yawDegrees,
      prompt === "front" ? maxYaw : sidePromptAngle,
    ),
  ];
  const passedCount = checks.filter((check) => check.passed).length;
  return {
    ready: passedCount === checks.length,
    score: passedCount / checks.length,
    checks,
    guidance: checks.filter((check) => !check.passed).map((check) => check.message),
  };
}
