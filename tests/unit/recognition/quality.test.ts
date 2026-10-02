import { describe, expect, it } from "vitest";
import { assessFaceQuality, type PosePrompt } from "../../../src/ai/recognition/quality";
import type { FaceResult } from "../../../src/types/vision";

function makeFrame(width: number, height: number, base: number, checker = false): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = checker ? ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 170 : 90) : base;
      const index = (y * width + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

const config = {
  minSizeRatio: 0.12,
  minBrightness: 40,
  maxBrightness: 220,
  minSharpness: 30,
  maxYawDegrees: 25,
  maxPitchDegrees: 25,
  minPoseAngleDegrees: 8,
  minDetectorConfidence: 0.5,
};

const face = (patch: Partial<FaceResult> = {}): FaceResult => ({
  box: { x: 0.25, y: 0.15, width: 0.5, height: 0.7 },
  detectorConfidence: 0.95,
  pose: { yaw: 0, pitch: 0, roll: 0 },
  ...patch,
});

describe("enrollment face quality", () => {
  it("appliesNamedQualityGates", () => {
    const badFace = face({ box: { x: 0.45, y: 0.4, width: 0.1, height: 0.1 }, pose: { yaw: 0, pitch: 0, roll: 0 } });
    const report = assessFaceQuality(badFace, makeFrame(64, 64, 18), "right" satisfies PosePrompt, config);

    expect(report.ready).toBe(false);
    expect(report.checks.find((check) => check.key === "face_size")?.passed).toBe(false);
    expect(report.checks.find((check) => check.key === "lighting")?.passed).toBe(false);
    expect(report.checks.find((check) => check.key === "sharpness")?.passed).toBe(false);
    expect(report.checks.find((check) => check.key === "pose")?.passed).toBe(false);
    expect(report.guidance.length).toBeGreaterThan(0);
  });

  it("acceptsAWellLitSharpFaceForTheRequestedPose", () => {
    const report = assessFaceQuality(
      face({ pose: { yaw: 0.2, pitch: 0.02, roll: 0 } }),
      makeFrame(64, 64, 120, true),
      "right",
      config,
    );

    expect(report.ready).toBe(true);
    expect(report.checks.every((check) => check.passed)).toBe(true);
  });
});
