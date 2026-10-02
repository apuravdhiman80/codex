import { describe, expect, it, vi } from "vitest";
import type { VisionEngine } from "../../../src/ai/engine/types";
import { loadVisionEngine } from "../../../src/ai/engine/modelLoader";
import { getModelBaseUrl, getObjectModelUrl, getWasmBaseUrl, MODEL_MANIFEST } from "../../../src/ai/engine/modelManifest";

describe("vision model loading", () => {
  it("reportsInitializationProgressAndSameOriginModelPaths", async () => {
    const engine = {
      initialize: vi.fn(async () => undefined),
      detect: vi.fn(),
      status: () => ({ state: "ready", message: "Models ready", backend: "webgl", progress: 1 }),
      configure: vi.fn(async () => undefined),
      dispose: vi.fn(async () => undefined),
    } as unknown as VisionEngine;
    const progress: string[] = [];

    await loadVisionEngine(engine, (status) => progress.push(status.state));

    expect(engine.initialize).toHaveBeenCalledOnce();
    expect(progress).toEqual(["loading", "ready"]);
  });

  it("exposesRecoverableLoadFailure", async () => {
    const engine = {
      initialize: vi.fn(async () => { throw new Error("Model download failed"); }),
      status: () => ({ state: "error", message: "Model download failed" }),
    } as unknown as VisionEngine;
    const progress: string[] = [];

    await expect(loadVisionEngine(engine, (status) => progress.push(status.state))).rejects.toThrow(/download failed/i);
    expect(progress).toEqual(["loading", "error"]);
  });

  it("resolvesEveryRuntimeAssetToTheVersionedApplicationOrigin", () => {
    const origin = "https://vision.example";
    const paths = [getModelBaseUrl(origin), getObjectModelUrl(origin), getWasmBaseUrl(origin), ...MODEL_MANIFEST.assets.map((asset) => new URL(asset.url, origin).href)];

    expect(paths.every((path) => new URL(path).origin === origin)).toBe(true);
    expect(paths.every((path) => new URL(path).pathname.startsWith("/models/v1/"))).toBe(true);
  });
});
