import { describe, expect, it, vi } from "vitest";
import { DEFAULT_VISION_SETTINGS } from "../../../src/config/vision";
import {
  HumanVisionEngine,
  buildHumanConfig,
  type EngineDependencies,
  type HumanRuntime,
} from "../../../src/ai/engine/humanEngine";

function mockDependencies(overrides: Partial<EngineDependencies> = {}) {
  const humanConfig = vi.fn();
  const humanDetect = vi.fn(async () => ({
    face: [{
      box: [10, 20, 30, 40],
      boxRaw: [0.1, 0.2, 0.3, 0.4],
      boxScore: 0.93,
      meshRaw: [[0.12, 0.22, 0.01]],
      embedding: new Array(1024).fill(0.125),
    }],
  }));
  const objectDetect = vi.fn(async () => [
    { bbox: [100, 50, 40, 30] as [number, number, number, number], class: "bottle", score: 0.91 },
  ]);
  const dependencies: EngineDependencies = {
    createHuman: vi.fn(async (config) => {
      humanConfig(config);
      return {
        load: vi.fn(async () => undefined),
        warmup: vi.fn(async () => undefined),
        detect: humanDetect,
        dispose: vi.fn(),
      } as unknown as HumanRuntime;
    }),
    loadObjectDetector: vi.fn(async () => ({ detect: objectDetect, dispose: vi.fn() })),
    now: (() => {
      let timestamp = 100;
      return () => timestamp++;
    })(),
    ...overrides,
  };
  return { dependencies, humanConfig, humanDetect, objectDetect };
}

describe("browser vision engine", () => {
  it("mapsRealModelOutputsWithoutInventingResults", async () => {
    const { dependencies } = mockDependencies();
    const engine = new HumanVisionEngine(dependencies);
    await engine.initialize();
    const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;

    const result = await engine.detect(video);

    expect(result.faces).toEqual([{
      box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      detectorConfidence: 0.93,
      landmarks: [{ x: 0.12, y: 0.22, z: 0.01 }],
      descriptor: new Float32Array(1024).fill(0.125),
    }]);
    expect(result.objects).toEqual([{
      box: { x: 100 / 640, y: 50 / 480, width: 40 / 640, height: 30 / 480 },
      className: "bottle",
      modelClassId: 39,
      detectorConfidence: 0.91,
    }]);
    expect(result.inferenceFinishedAt).toBeGreaterThan(result.inferenceStartedAt);
    await engine.dispose();
  });

  it("disablesUnrequestedHumanModules", () => {
    const config = buildHumanConfig("https://vision.example/models/v1/human/");
    expect(config.modelBasePath).toBe("https://vision.example/models/v1/human/");
    expect(config.face?.enabled).toBe(true);
    expect(config.face?.detector?.enabled).toBe(true);
    expect(config.face?.detector?.modelPath).toBe("blazeface.json");
    expect(config.face?.detector?.minConfidence).toBe(0.35);
    expect(config.face?.detector?.maxDetected).toBe(8);
    expect(config.face?.mesh?.enabled).toBe(true);
    expect(config.face?.mesh?.modelPath).toBe("facemesh.json");
    expect(config.face?.description?.enabled).toBe(true);
    expect(config.face?.description?.modelPath).toBe("faceres.json");
    expect(config.face?.emotion?.enabled).toBe(false);
    expect(config.face?.gear?.enabled).toBe(false);
    expect(config.face?.antispoof?.enabled).toBe(false);
    expect(config.face?.liveness?.enabled).toBe(false);
    expect(config.body?.enabled).toBe(false);
    expect(config.hand?.enabled).toBe(false);
    expect(config.object?.enabled).toBe(false);
    expect(config.segmentation?.enabled).toBe(false);
    expect(config.gesture?.enabled).toBe(false);
  });

  it("handlesModelLoadFailureAndRetry", async () => {
    let attempts = 0;
    const { dependencies } = mockDependencies({
      createHuman: vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("model files unavailable");
        return {
          load: vi.fn(async () => undefined),
          warmup: vi.fn(async () => undefined),
          detect: vi.fn(async () => ({ face: [] })),
          dispose: vi.fn(),
        } as unknown as HumanRuntime;
      }),
    });
    const engine = new HumanVisionEngine(dependencies);

    await expect(engine.initialize()).rejects.toThrow(/model files unavailable/i);
    expect(engine.status().state).toBe("error");
    await expect(engine.initialize()).resolves.toBeUndefined();
    expect(engine.status().state).toBe("ready");
  });

  it("serializesInferenceAndKeepsConfiguredThresholds", async () => {
    let release: ((value: { face: [] }) => void) | undefined;
    const detection = new Promise<{ face: [] }>((resolve) => { release = resolve; });
    const { dependencies, humanDetect, objectDetect } = mockDependencies();
    const serializedDetect = vi.fn(() => detection);
    (dependencies.createHuman as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      load: vi.fn(async () => undefined),
      warmup: vi.fn(async () => undefined),
      detect: serializedDetect,
      dispose: vi.fn(),
    } as unknown as HumanRuntime));
    const engine = new HumanVisionEngine(dependencies, DEFAULT_VISION_SETTINGS);
    await engine.initialize();
    const frame = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;

    const first = engine.detect(frame);
    const second = engine.detect(frame);
    expect(await Promise.race([second.then(() => "settled"), Promise.resolve("pending")] )).toBe("pending");
    expect(serializedDetect).toHaveBeenCalledOnce();
    release?.({ face: [] });
    await Promise.all([first, second]);
    expect(humanDetect).not.toHaveBeenCalled();
    expect(objectDetect).toHaveBeenCalledOnce();
    await engine.configure({ ...DEFAULT_VISION_SETTINGS, objectThreshold: 0.75 });
    expect(engine.status().state).toBe("ready");
  });
});
