import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISION_SETTINGS,
  SettingsValidationError,
  migrateLegacySettings,
  normalizeVisionSettings,
} from "../../../src/config/vision";

describe("vision settings", () => {
  it("uses the documented conservative defaults", () => {
    expect(DEFAULT_VISION_SETTINGS).toMatchObject({
      objectThreshold: 0.5,
      recognitionThreshold: 0.62,
      unknownMatchMargin: 0.05,
      maxEnrollmentSamples: 5,
      maxInputWidth: 640,
      maxInputHeight: 480,
      inferenceIntervalMs: 180,
      trackExpiryMs: 1800,
    });
  });

  it("clampsThresholdsAndRejectsInvalidSettings", () => {
    const result = normalizeVisionSettings({
      ...DEFAULT_VISION_SETTINGS,
      objectThreshold: 1.7,
      recognitionThreshold: 0.2,
      unknownMatchMargin: -3,
    });

    expect(result.objectThreshold).toBe(0.99);
    expect(result.recognitionThreshold).toBe(0.4);
    expect(result.unknownMatchMargin).toBe(0.01);
    expect(() => normalizeVisionSettings({ maxEnrollmentSamples: 2.5 })).toThrow(
      SettingsValidationError,
    );
  });

  it("migratesLegacySettings", () => {
    const migrated = migrateLegacySettings({
      recognitionThreshold: 0.73,
      detectionThreshold: 0.66,
      cameraFacingMode: "environment",
      theme: "light",
    });

    expect(migrated.recognitionThreshold).toBe(0.73);
    expect(migrated.objectThreshold).toBe(0.66);
    expect(migrated.cameraFacingMode).toBe("environment");
    expect(migrated.theme).toBe("light");
    expect(migrated.inferenceIntervalMs).toBe(
      DEFAULT_VISION_SETTINGS.inferenceIntervalMs,
    );
  });
});
