export interface ModelAsset {
  url: string;
  sha256: string;
  sizeBytes: number;
  license: string;
  source: string;
}

export interface VersionedModelManifest {
  version: string;
  modelId: string;
  humanVersion?: string;
  cocoSsdVersion?: string;
  assets: readonly ModelAsset[];
}

export const MODEL_MANIFEST_VERSION = "v1";
export const MODEL_BASE_PATH = `/models/${MODEL_MANIFEST_VERSION}/`;
export const MODEL_CACHE_NAME = `visionid-model-assets-${MODEL_MANIFEST_VERSION}`;
export const MODEL_ID = "human-3.3.6-faceres-coco-ssd-2.2.3-lite-mobilenet-v2";

export const MODEL_MANIFEST: VersionedModelManifest = {
  version: MODEL_MANIFEST_VERSION,
  modelId: MODEL_ID,
  humanVersion: "3.3.6",
  cocoSsdVersion: "2.2.3",
  assets: [
    { url: "/models/v1/human/blazeface.json", sha256: "cd7bbfc078270572beb39f9e5ae67aadbd50b5e67cff37e6d4f6b3ea39312e5f", sizeBytes: 79038, license: "Apache-2.0", source: "https://github.com/google/mediapipe" },
    { url: "/models/v1/human/blazeface.bin", sha256: "dc9a97fdc50bc43216554bdd69aa3e7b9361a519ee7bdd996a2f69a98a6f9b72", sizeBytes: 538928, license: "Apache-2.0", source: "https://github.com/google/mediapipe" },
    { url: "/models/v1/human/facemesh.json", sha256: "b60ca26f404724f43bd2b1575761d8265180e1f053cc0731caa68462927309e7", sizeBytes: 95845, license: "Apache-2.0", source: "https://github.com/google/mediapipe" },
    { url: "/models/v1/human/facemesh.bin", sha256: "3826da640b0a3021161605369ee6af293f75d518040355b960ec71a3390c1c0b", sizeBytes: 1477958, license: "Apache-2.0", source: "https://github.com/google/mediapipe" },
    { url: "/models/v1/human/faceres.json", sha256: "5b83d49c0385d2e68a05122441b94226313677cae9fcc40b9587ad50079eb4df", sizeBytes: 71432, license: "Apache-2.0", source: "https://github.com/HSE-asavchenko/HSE_FaceRec_tf" },
    { url: "/models/v1/human/faceres.bin", sha256: "2c7d2d62b76c97528b736527aa09d310ea71743c9e3e79fb6c62d4b2d73af79b", sizeBytes: 6978814, license: "Apache-2.0", source: "https://github.com/HSE-asavchenko/HSE_FaceRec_tf" },
    { url: "/models/v1/coco-ssd/model.json", sha256: "3770b2528339b1e3340cb74360e1e40401816b009779aeb8d0cce3a4353ea3a9", sizeBytes: 527315, license: "Apache-2.0", source: "https://www.kaggle.com/models/tensorflow/ssdlite-mobilenet-v2/tfJs/default/1" },
    { url: "/models/v1/coco-ssd/group1-shard1of5", sha256: "0e7af0f713e98521252321f7f84892c31cefccccec3ac64c84e5065b75ed5646", sizeBytes: 4194304, license: "Apache-2.0", source: "https://www.kaggle.com/models/tensorflow/ssdlite-mobilenet-v2/tfJs/default/1" },
    { url: "/models/v1/coco-ssd/group1-shard2of5", sha256: "74cc6cfc2c4510c9cd81b8ad4cebf6f6a8f305119bb365ce0eb96276da38519a", sizeBytes: 4194304, license: "Apache-2.0", source: "https://www.kaggle.com/models/tensorflow/ssdlite-mobilenet-v2/tfJs/default/1" },
    { url: "/models/v1/coco-ssd/group1-shard3of5", sha256: "50383033f893eae136392a403e8f70ade5efd90867df5695c4ca5ac640e14f38", sizeBytes: 4194304, license: "Apache-2.0", source: "https://www.kaggle.com/models/tensorflow/ssdlite-mobilenet-v2/tfJs/default/1" },
    { url: "/models/v1/coco-ssd/group1-shard4of5", sha256: "d856dc534c780068bbf6c666ce1516df2c8433d87578aa31fcdf197de7058cc2", sizeBytes: 4194304, license: "Apache-2.0", source: "https://www.kaggle.com/models/tensorflow/ssdlite-mobilenet-v2/tfJs/default/1" },
    { url: "/models/v1/coco-ssd/group1-shard5of5", sha256: "3d356f1fb6dfca6af78c56db34d9326706d0196e303f9de6b04f236ca79ed309", sizeBytes: 1257312, license: "Apache-2.0", source: "https://www.kaggle.com/models/tensorflow/ssdlite-mobilenet-v2/tfJs/default/1" },
    { url: "/models/v1/tfjs-wasm/tfjs-backend-wasm.wasm", sha256: "70a5d516060464e5269f01c74bac1772d6b8ab6cb612acf16b5cdaf61f78d892", sizeBytes: 311123, license: "Apache-2.0", source: "https://github.com/tensorflow/tfjs" },
    { url: "/models/v1/tfjs-wasm/tfjs-backend-wasm-simd.wasm", sha256: "77ebb28a6d34f371dbbf2086b7f2de8994acd8ea5a3cf1fa24d2c26c840cac7b", sizeBytes: 424594, license: "Apache-2.0", source: "https://github.com/tensorflow/tfjs" },
    { url: "/models/v1/tfjs-wasm/tfjs-backend-wasm-threaded-simd.wasm", sha256: "c052228d4bef185c27bbe59a9e029570c78bbb9f08b3cb46b597851650373de2", sizeBytes: 435643, license: "Apache-2.0", source: "https://github.com/tensorflow/tfjs" },
  ],
};

export function resolveModelAssetUrl(path: string, origin: string): string {
  const resolved = new URL(path, origin);
  if (
    resolved.origin !== origin ||
    !resolved.pathname.startsWith(`${MODEL_BASE_PATH}`) ||
    resolved.username ||
    resolved.password
  ) {
    throw new Error("Model asset URL must be an allowlisted same-origin path.");
  }
  return resolved.href;
}

export function getModelBaseUrl(origin: string): string {
  return new URL(`${MODEL_BASE_PATH}human/`, origin).href;
}

export function getObjectModelUrl(origin: string): string {
  return new URL(`${MODEL_BASE_PATH}coco-ssd/model.json`, origin).href;
}

export function getWasmBaseUrl(origin: string): string {
  return new URL(`${MODEL_BASE_PATH}tfjs-wasm/`, origin).href;
}
