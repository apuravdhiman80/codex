import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VISION_SETTINGS } from "../../../src/config/vision";
import { WorkerVisionEngine } from "../../../src/ai/worker/workerVisionEngine";

class FakeWorker {
  listeners = new Map<string, Set<EventListener>>();
  messages: Array<{ id: number; type: string; [key: string]: unknown }> = [];
  addEventListener(type: string, listener: EventListener) {
    const group = this.listeners.get(type) ?? new Set<EventListener>();
    group.add(listener);
    this.listeners.set(type, group);
  }
  postMessage(message: { id: number; type: string; [key: string]: unknown }) {
    this.messages.push(message);
  }
  terminate = vi.fn();
  respond(data: unknown) {
    this.listeners.get("message")?.forEach((listener) => listener(new MessageEvent("message", { data })));
  }
}

describe("transferable inference worker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("downscalesFramesAndDoesNotQueueOverlappingInference", async () => {
    const bitmap = { width: 1280, height: 720, close: vi.fn() } as unknown as ImageBitmap;
    const makeBitmap = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", makeBitmap);
    const worker = new FakeWorker();
    const engine = new WorkerVisionEngine(worker as unknown as Worker, DEFAULT_VISION_SETTINGS);
    const frame = { videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement;

    const first = engine.detect(frame);
    const second = engine.detect(frame);

    expect(await Promise.race([second.then(() => "settled"), Promise.resolve("pending")])).toBe("pending");
    expect(makeBitmap).toHaveBeenCalledOnce();
    expect(makeBitmap).toHaveBeenCalledWith(frame, { resizeWidth: 640, resizeHeight: 360, resizeQuality: "high" });
    expect(worker.messages.filter((message) => message.type === "detect")).toHaveLength(1);
    const request = worker.messages.find((message) => message.type === "detect")!;
    worker.respond({ id: request.id, type: "result", result: {
      faces: [], objects: [], modelId: "test", inferenceStartedAt: 1, inferenceFinishedAt: 2, warnings: [],
    } });
    await expect(first).resolves.toMatchObject({ modelId: "test" });
    await expect(second).resolves.toMatchObject({ modelId: "test" });
  });
});
