import type { ObjectDetectorRuntime } from "./objectDetection";

export async function loadCocoObjectDetector(modelUrl: string, wasmBaseUrl: string): Promise<ObjectDetectorRuntime> {
  const tf = await import("@tensorflow/tfjs-core");
  let backend: "webgl" | "wasm" | "cpu" = "webgl";
  await import("@tensorflow/tfjs-backend-webgl");
  try {
    const ready = await tf.setBackend("webgl");
    if (!ready) throw new Error("WebGL backend is unavailable");
    await tf.ready();
  } catch {
    try {
      const wasm = await import("@tensorflow/tfjs-backend-wasm");
      wasm.setWasmPaths(wasmBaseUrl);
      const ready = await tf.setBackend("wasm");
      if (!ready) throw new Error("WASM backend is unavailable");
      backend = "wasm";
      await tf.ready();
    } catch {
      await import("@tensorflow/tfjs-backend-cpu");
      const ready = await tf.setBackend("cpu");
      if (!ready) throw new Error("No supported TensorFlow.js backend is available");
      backend = "cpu";
      await tf.ready();
    }
  }
  const coco = await import("@tensorflow-models/coco-ssd");
  const model = await coco.load({ base: "lite_mobilenet_v2", modelUrl });
  return {
    backend,
    detect: (input, maxNumBoxes, minScore) => model.detect(input as HTMLVideoElement, maxNumBoxes, minScore),
    dispose: () => model.dispose(),
  };
}
