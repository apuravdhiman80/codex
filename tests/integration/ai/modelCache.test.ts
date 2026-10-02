import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appDatabase } from "../../../src/data/db";
import { createProfile, getProfile } from "../../../src/data/repositories/peopleRepository";
import { cacheModelAssets, clearModelCache, type ModelCacheEnvironment } from "../../../src/ai/engine/modelCache";
import type { VersionedModelManifest } from "../../../src/ai/engine/modelManifest";

function cacheEnvironment() {
  const data = new Map<string, Response>();
  const cache = {
    put: async (request: RequestInfo | URL, response: Response) => data.set(String(request), response),
    match: async (request: RequestInfo | URL) => data.get(String(request)),
    add: async () => undefined,
  };
  const cacheStorage = {
    open: async () => cache,
    delete: async () => { data.clear(); return true; },
    keys: async () => ["visionid-model-assets-v1"],
  };
  const fetcher = vi.fn(async (...[input, init]: [RequestInfo | URL, RequestInit?]) => {
    expect(input).toBeDefined();
    expect(init).toBeDefined();
    return new Response("model-bits", { status: 200 });
  });
  return {
    data,
    fetcher,
    environment: {
      origin: "https://vision.example",
      cacheStorage,
      fetcher,
      digest: async () => "eacbaa7f14b05a5a637bde9b8a7452dc314e1b38c4ae1c4130163c7ec91cf761",
    } as unknown as ModelCacheEnvironment,
  };
}

const testManifest: VersionedModelManifest = {
  version: "v1",
  modelId: "test-model-v1",
  assets: [{
    url: "/models/v1/test/model.bin",
    sha256: "eacbaa7f14b05a5a637bde9b8a7452dc314e1b38c4ae1c4130163c7ec91cf761",
    sizeBytes: 10,
    license: "Apache-2.0",
    source: "https://example.com/model",
  }],
};

describe("versioned model cache", () => {
  beforeEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
    await appDatabase.open();
  });
  afterEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
  });

  it("cachesOnlyAllowlistedSameOriginAssets", async () => {
    const { data, fetcher, environment } = cacheEnvironment();

    await cacheModelAssets(testManifest, environment);

    expect(fetcher.mock.calls[0]?.[0]).toBe("https://vision.example/models/v1/test/model.bin");
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: "same-origin", redirect: "error" });
    expect(data.size).toBe(1);
    await expect(cacheModelAssets({ ...testManifest, assets: [{
      ...testManifest.assets[0], url: "https://third-party.example/model.bin",
    }] }, environment)).rejects.toThrow(/same-origin|allowlist/i);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("clearModelCachePreservesPersonalData", async () => {
    const profile = await createProfile({ personId: "P-CACHE", name: "Stored Person", consentRecordedAt: Date.now() });
    const { environment } = cacheEnvironment();

    await cacheModelAssets(testManifest, environment);
    await clearModelCache(environment);

    expect(await getProfile(profile.id)).toMatchObject({ id: profile.id, name: "Stored Person" });
  });

  it("rejectsTamperedModelFilesBeforeCaching", async () => {
    const { data, environment } = cacheEnvironment();
    const tampered = { ...environment, digest: async () => "0".repeat(64) };

    await expect(cacheModelAssets(testManifest, tampered)).rejects.toThrow(/integrity check failed/i);
    expect(data.size).toBe(0);
  });
});
