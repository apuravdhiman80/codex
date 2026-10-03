import { describe, expect, it, vi } from "vitest";
import { DEFAULT_VISION_SETTINGS } from "../../../src/config/vision";
import { ObjectDetectionEngine } from "../../../src/ai/engine/objectEngine";

describe("object-only detection engine", () => {
  it("loads only COCO SSD and excludes person detections", async () => {
    const detect = vi.fn(async () => [
      { bbox: [10, 20, 30, 40] as [number, number, number, number], class: "person", score: 0.99 },
      { bbox: [100, 50, 40, 30] as [number, number, number, number], class: "bottle", score: 0.91 },
    ]);
    const dispose = vi.fn();
    const loadObjectDetector = vi.fn(async () => ({ detect, dispose, backend: "webgl" as const }));
    const engine = new ObjectDetectionEngine({ loadObjectDetector, now: (() => {
      let timestamp = 100;
      return () => timestamp++;
    })() }, DEFAULT_VISION_SETTINGS);

    await engine.initialize();
    const result = await engine.detect({ videoWidth: 640, videoHeight: 480 } as HTMLVideoElement);

    expect(loadObjectDetector).toHaveBeenCalledOnce();
    expect(engine.status()).toMatchObject({ state: "ready", activeModels: ["COCO-SSD Lite"] });
    expect(result.faces).toEqual([]);
    expect(result.objects).toEqual([{
      box: { x: 100 / 640, y: 50 / 480, width: 40 / 640, height: 30 / 480 },
      className: "bottle",
      modelClassId: 39,
      detectorConfidence: 0.91,
    }]);
    await engine.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
