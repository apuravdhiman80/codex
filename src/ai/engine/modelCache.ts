import { DataLayerError } from "../../data/db";
import { MODEL_CACHE_NAME, type VersionedModelManifest } from "./modelManifest";

export interface ModelCacheEnvironment {
  origin: string;
  cacheStorage: Pick<CacheStorage, "open" | "delete">;
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  digest: (bytes: ArrayBuffer) => Promise<string>;
}

function browserEnvironment(): ModelCacheEnvironment {
  if (typeof caches === "undefined" || typeof fetch === "undefined" || typeof crypto === "undefined") {
    throw new DataLayerError("unavailable", "This browser does not support safe local model caching.");
  }
  return {
    origin: location.origin,
    cacheStorage: caches,
    fetcher: fetch.bind(globalThis),
    digest: async (bytes) => {
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    },
  };
}

function validateAllowlist(manifest: VersionedModelManifest, environment: ModelCacheEnvironment): URL[] {
  if (!/^[a-z0-9-]+$/iu.test(manifest.version) || !manifest.assets.length) {
      throw new DataLayerError("invalid", "The model manifest is empty or has an invalid version.");
  }
  const prefix = `/models/${manifest.version}/`;
  const seen = new Set<string>();
  return manifest.assets.map((asset) => {
    let url: URL;
    try {
      url = new URL(asset.url, environment.origin);
    } catch {
      throw new DataLayerError("invalid", "A model asset URL is invalid.");
    }
    if (
      url.origin !== environment.origin ||
      !url.pathname.startsWith(prefix) ||
      url.username || url.password || url.search || url.hash ||
      seen.has(url.href) ||
      !/^[a-f0-9]{64}$/iu.test(asset.sha256) ||
      !Number.isSafeInteger(asset.sizeBytes) || asset.sizeBytes < 0
    ) {
      throw new DataLayerError("invalid", "Model assets must be unique, same-origin, versioned, and fully verified.");
    }
    seen.add(url.href);
    return url;
  });
}

export async function cacheModelAssets(
  manifest: VersionedModelManifest,
  environment: ModelCacheEnvironment = browserEnvironment(),
): Promise<void> {
  const urls = validateAllowlist(manifest, environment);
  const bucket = await environment.cacheStorage.open(`visionid-model-assets-${manifest.version}`);
  for (const [index, asset] of manifest.assets.entries()) {
    const response = await environment.fetcher(urls[index]!.href, {
      method: "GET",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-cache",
    });
    if (!response.ok || response.type === "opaque") {
      throw new DataLayerError("unavailable", `Model asset request failed (${response.status}).`);
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== asset.sizeBytes || (await environment.digest(bytes)).toLowerCase() !== asset.sha256.toLowerCase()) {
      throw new DataLayerError("invalid", `Model asset integrity check failed for ${urls[index]!.pathname}.`);
    }
    const headers = new Headers(response.headers);
    headers.set("X-VisionID-SHA256", asset.sha256.toLowerCase());
    await bucket.put(urls[index]!, new Response(bytes, { status: response.status, statusText: response.statusText, headers }));
  }
}

export async function clearModelCache(environment: ModelCacheEnvironment = browserEnvironment()): Promise<void> {
  // CacheStorage is separate from the application's IndexedDB; only this app's model bucket is removed.
  const versionedName = MODEL_CACHE_NAME;
  await environment.cacheStorage.delete(versionedName);
}

