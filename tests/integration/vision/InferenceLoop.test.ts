import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VISION_SETTINGS } from "../../../src/config/vision";
import { InferenceLoop, stopActiveVision, type InferenceLoopDependencies } from "../../../src/features/vision/InferenceLoop";
import type { VisionEngine, FrameResult } from "../../../src/ai/engine/types";
import type { VisionSettings } from "../../../src/types/vision";
import type { NewDetectionEvent } from "../../../src/types/events";
import type { PersonProfile, FaceTemplate } from "../../../src/types/person";

const frame: FrameResult = {
  faces: [],
  objects: [{ box: { x: 0.1, y: 0.2, width: 0.3, height: 0.25 }, className: "bottle", modelClassId: 39, detectorConfidence: 0.93 }],
  modelId: "face-model-v1",
  inferenceStartedAt: 100,
  inferenceFinishedAt: 112,
  warnings: [],
};

function makeLoop(options: Partial<InferenceLoopDependencies> = {}) {
  const engine = {
    initialize: vi.fn(async () => undefined),
    detect: vi.fn(async () => frame),
    status: () => ({ state: "ready" as const, message: "Ready", progress: 1, activeModels: ["Face", "Object"] }),
    configure: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
    similarity: vi.fn(() => 0.9),
  } as unknown as VisionEngine;
  const dependencies: InferenceLoopDependencies = {
    video: { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
    engine,
    settings: { ...DEFAULT_VISION_SETTINGS, inferenceIntervalMs: 40 } as VisionSettings,
    mode: "fusion",
    onFrame: vi.fn(),
    listProfiles: vi.fn(async () => []),
    listTemplatesForPerson: vi.fn(async () => []),
    queryEvents: vi.fn(async () => []),
    addEvents: vi.fn(async (events: NewDetectionEvent[]) => events.map((event, index) => ({ ...event, id: `event-${index}` }))),
    now: () => performance.now(),
    ...options,
  };
  return { loop: new InferenceLoop(dependencies), engine, dependencies };
}

describe("serial local inference loop", () => {
  afterEach(() => vi.useRealTimers());

  it("neverOverlapsFrames", async () => {
    let resolveFirst!: (result: FrameResult) => void;
    const first = new Promise<FrameResult>((resolve) => { resolveFirst = resolve; });
    const detect = vi.fn(() => first);
    const { loop } = makeLoop({ engine: { detect, status: () => ({ state: "ready", message: "Ready", progress: 1, activeModels: [] }), similarity: () => 0.9 } as unknown as VisionEngine });
    loop.start();
    await vi.waitFor(() => expect(detect).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(detect).toHaveBeenCalledOnce();
    const stopped = loop.stop();
    resolveFirst(frame);
    await stopped;
  });

  it("throttlesInferenceToSettings", async () => {
    const starts: number[] = [];
    const { loop, engine } = makeLoop({
      engine: {
        detect: vi.fn(async () => { starts.push(performance.now()); return frame; }),
        status: () => ({ state: "ready", message: "Ready", progress: 1, activeModels: [] }),
        similarity: () => 0.9,
      } as unknown as VisionEngine,
      settings: { ...DEFAULT_VISION_SETTINGS, inferenceIntervalMs: 45 },
    });
    loop.start();
    await new Promise((resolve) => setTimeout(resolve, 155));
    await loop.stop();
    expect(starts.length).toBeGreaterThanOrEqual(3);
    expect(starts.slice(1).every((start, index) => start - starts[index]! >= 38)).toBe(true);
    expect(engine).toBeDefined();
  });

  it("derivesLatencyAndSeparatesEventScores", async () => {
    const onFrame = vi.fn();
    const { loop, dependencies } = makeLoop({ onFrame });
    loop.start();
    await vi.waitFor(() => expect(onFrame).toHaveBeenCalled());
    const view = onFrame.mock.calls[0]![0];
    expect(view.inferenceLatencyMs).toBe(12);
    expect(view.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(view.objects[0]?.detectorConfidence).toBe(0.93);
    expect(dependencies.addEvents).toHaveBeenCalled();
    await loop.stop();
  });

  it("handlesIndependentFacesAndObjectsAndKeepsUnknownConservative", async () => {
    const profile: PersonProfile = {
      id: "person-local-1", personId: "P001", name: "Asha Rao", role: "Student", department: "Vision",
      metadata: {}, createdAt: 1, updatedAt: 1, consentRecordedAt: 1, isDemo: false,
    };
    const descriptor = new Float32Array(1024).fill(0.1);
    const template: FaceTemplate = {
      id: "template-1", personId: profile.id, descriptor: new Float32Array(descriptor), quality: 0.9,
      pose: "front", createdAt: 1, modelId: "face-model-v1", isDemo: false,
    };
    const result: FrameResult = {
      ...frame,
      faces: [
        { box: { x: 0.2, y: 0.1, width: 0.2, height: 0.3 }, detectorConfidence: 0.94, descriptor },
        { box: { x: 0.6, y: 0.1, width: 0.2, height: 0.3 }, detectorConfidence: 0.89 },
      ],
    };
    const onFrame = vi.fn();
    const engine = {
      detect: vi.fn(async () => result),
      status: () => ({ state: "ready" as const, message: "Ready", progress: 1, activeModels: [] }),
      similarity: () => 0.9,
    } as unknown as VisionEngine;
    const { loop, dependencies } = makeLoop({ engine, onFrame, listProfiles: vi.fn(async () => [profile]), listTemplatesForPerson: vi.fn(async () => [template]) });
    loop.start();
    await vi.waitFor(() => expect(onFrame).toHaveBeenCalled());
    const view = onFrame.mock.calls[0]![0];
    expect(view.faces[0]?.decision.status).toBe("recognized");
    expect(view.faces[0]?.profile?.name).toBe("Asha Rao");
    expect(view.faces[1]?.decision.status).toBe("unknown");
    expect(view.objects).toHaveLength(1);
    expect(dependencies.addEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: "person_recognized", detectorConfidence: 0.94, recognitionSimilarity: 0.9 }),
      expect.objectContaining({ type: "unknown_face", detectorConfidence: 0.89 }),
      expect.objectContaining({ type: "object_detected", detectorConfidence: 0.93 }),
    ]));
    await loop.stop();
  });

  it("ignoresResultsThatFinishAfterStop", async () => {
    let resolveFirst!: (result: FrameResult) => void;
    const first = new Promise<FrameResult>((resolve) => { resolveFirst = resolve; });
    const engine = { detect: () => first, status: () => ({ state: "ready", message: "Ready", progress: 1, activeModels: [] }), similarity: () => 0.9 } as unknown as VisionEngine;
    const detect = vi.fn(() => first);
    const { loop, dependencies } = makeLoop({ engine: { ...engine, detect } as unknown as VisionEngine });
    loop.start();
    await vi.waitFor(() => expect(detect).toHaveBeenCalledOnce());
    const stopped = loop.stop();
    resolveFirst(frame);
    await stopped;
    expect(dependencies.addEvents).not.toHaveBeenCalled();
    expect(dependencies.onFrame).not.toHaveBeenCalled();
  });

  it("stopReleasesCamera", async () => {
    const releaseCamera = vi.fn();
    const { loop } = makeLoop({ onStop: releaseCamera });
    loop.start();
    await vi.waitFor(() => expect(releaseCamera).not.toHaveBeenCalled());
    await loop.stop();
    expect(releaseCamera).toHaveBeenCalledOnce();
  });

  it("stopActiveVisionInvalidatesEveryCurrentLoop", async () => {
    let finish!: (result: FrameResult) => void;
    const detection = new Promise<FrameResult>((resolve) => { finish = resolve; });
    const detect = vi.fn(() => detection);
    const releaseCamera = vi.fn();
    const { loop, dependencies } = makeLoop({
      engine: { detect, status: () => ({ state: "ready", message: "Ready", progress: 1, activeModels: [] }), similarity: () => 0.9 } as unknown as VisionEngine,
      onStop: releaseCamera,
    });
    loop.start();
    await vi.waitFor(() => expect(detect).toHaveBeenCalledOnce());
    const stopped = stopActiveVision();
    finish(frame);
    await stopped;
    expect(releaseCamera).toHaveBeenCalledOnce();
    expect(dependencies.addEvents).not.toHaveBeenCalled();
    expect(dependencies.onFrame).not.toHaveBeenCalled();
  });
});

describe("normalized overlay coordinates", () => {
  it("drawsScaledBoxes", async () => {
    const { scaleBoxToCanvas } = await import("../../../src/features/vision/DetectionOverlay");
    expect(scaleBoxToCanvas({ x: 0.1, y: 0.2, width: 0.3, height: 0.25 }, 800, 600)).toEqual({ x: 80, y: 120, width: 240, height: 150 });
  });
});
