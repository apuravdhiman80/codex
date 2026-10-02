const MODEL_CACHE = "visionid-model-assets-v1";
const PREFIX = "/models/v1/";
const ASSETS = new Map([
  ["/models/v1/human/blazeface.json", ["cd7bbfc078270572beb39f9e5ae67aadbd50b5e67cff37e6d4f6b3ea39312e5f", 79038]],
  ["/models/v1/human/blazeface.bin", ["dc9a97fdc50bc43216554bdd69aa3e7b9361a519ee7bdd996a2f69a98a6f9b72", 538928]],
  ["/models/v1/human/facemesh.json", ["b60ca26f404724f43bd2b1575761d8265180e1f053cc0731caa68462927309e7", 95845]],
  ["/models/v1/human/facemesh.bin", ["3826da640b0a3021161605369ee6af293f75d518040355b960ec71a3390c1c0b", 1477958]],
  ["/models/v1/human/faceres.json", ["5b83d49c0385d2e68a05122441b94226313677cae9fcc40b9587ad50079eb4df", 71432]],
  ["/models/v1/human/faceres.bin", ["2c7d2d62b76c97528b736527aa09d310ea71743c9e3e79fb6c62d4b2d73af79b", 6978814]],
  ["/models/v1/coco-ssd/model.json", ["3770b2528339b1e3340cb74360e1e40401816b009779aeb8d0cce3a4353ea3a9", 527315]],
  ["/models/v1/coco-ssd/group1-shard1of5", ["0e7af0f713e98521252321f7f84892c31cefccccec3ac64c84e5065b75ed5646", 4194304]],
  ["/models/v1/coco-ssd/group1-shard2of5", ["74cc6cfc2c4510c9cd81b8ad4cebf6f6a8f305119bb365ce0eb96276da38519a", 4194304]],
  ["/models/v1/coco-ssd/group1-shard3of5", ["50383033f893eae136392a403e8f70ade5efd90867df5695c4ca5ac640e14f38", 4194304]],
  ["/models/v1/coco-ssd/group1-shard4of5", ["d856dc534c780068bbf6c666ce1516df2c8433d87578aa31fcdf197de7058cc2", 4194304]],
  ["/models/v1/coco-ssd/group1-shard5of5", ["3d356f1fb6dfca6af78c56db34d9326706d0196e303f9de6b04f236ca79ed309", 1257312]],
  ["/models/v1/tfjs-wasm/tfjs-backend-wasm.wasm", ["70a5d516060464e5269f01c74bac1772d6b8ab6cb612acf16b5cdaf61f78d892", 311123]],
  ["/models/v1/tfjs-wasm/tfjs-backend-wasm-simd.wasm", ["77ebb28a6d34f371dbbf2086b7f2de8994acd8ea5a3cf1fa24d2c26c840cac7b", 424594]],
  ["/models/v1/tfjs-wasm/tfjs-backend-wasm-threaded-simd.wasm", ["c052228d4bef185c27bbe59a9e029570c78bbb9f08b3cb46b597851650373de2", 435643]],
]);

const workerScope = globalThis;
workerScope.addEventListener("install", (event) => event.waitUntil(workerScope.skipWaiting()));
workerScope.addEventListener("activate", (event) => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith("visionid-model-assets-") && name !== MODEL_CACHE).map((name) => caches.delete(name)));
  await workerScope.clients.claim();
})()));
workerScope.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== workerScope.location.origin || !url.pathname.startsWith(PREFIX)) return;
  const expected = ASSETS.get(url.pathname);
  if (!expected || url.search || url.hash) return;
  event.respondWith((async () => {
    const cache = await caches.open(MODEL_CACHE);
    const cached = await cache.match(url.href);
    if (cached) {
      const cachedBytes = await cached.clone().arrayBuffer();
      const cachedDigest = await crypto.subtle.digest("SHA-256", cachedBytes);
      const cachedHash = [...new Uint8Array(cachedDigest)].map((value) => value.toString(16).padStart(2, "0")).join("");
      if (cachedBytes.byteLength === expected[1] && cachedHash === expected[0]) return cached;
      await cache.delete(url.href);
    }
    try {
      const response = await fetch(request, { redirect: "error", credentials: "same-origin" });
      if (!response.ok || response.type === "opaque") return new Response("Model asset request failed.", { status: 502 });
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
      if (bytes.byteLength !== expected[1] || hash !== expected[0]) return new Response("Model asset integrity check failed.", { status: 502 });
      const headers = new Headers(response.headers);
      headers.set("X-VisionID-SHA256", hash);
      const verified = new Response(bytes, { status: response.status, statusText: response.statusText, headers });
      await cache.put(url.href, verified.clone());
      return verified;
    } catch {
      return new Response("Model asset could not be verified. Retry after checking the network.", { status: 502 });
    }
  })());
});
