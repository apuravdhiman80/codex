import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import type { VisionSettings } from "../../types/vision";
import { ObjectDetectionEngine } from "../engine/objectEngine";
import { loadVisionEngine } from "../engine/modelLoader";
import type { FrameResult, ModelStatus } from "../engine/types";

type WorkerRequest =
  | { id: number; type: "initialize"; settings: VisionSettings }
  | { id: number; type: "detect"; bitmap: ImageBitmap }
  | { id: number; type: "configure"; settings: VisionSettings }
  | { id: number; type: "dispose" };

type WorkerReply =
  | { id: number; type: "status"; status: ModelStatus }
  | { id: number; type: "result"; result?: FrameResult }
  | { id: number; type: "error"; message: string };

const worker = globalThis as unknown as {
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerRequest>) => void): void;
  postMessage(message: WorkerReply): void;
};
let engine: ObjectDetectionEngine | undefined;
let statusSubscription: (() => void) | undefined;

function reply(message: WorkerReply): void {
  worker.postMessage(message);
}

worker.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  void (async () => {
    try {
      if (request.type === "initialize") {
        if (engine) await engine.dispose();
        engine = new ObjectDetectionEngine(undefined, request.settings ?? DEFAULT_VISION_SETTINGS);
        statusSubscription?.();
        statusSubscription = engine.subscribeStatus?.((status) => reply({ id: request.id, type: "status", status }));
        await loadVisionEngine(engine, (status) => reply({ id: request.id, type: "status", status }));
        reply({ id: request.id, type: "result" });
      } else if (request.type === "detect") {
        if (!engine) throw new Error("Object detector is not initialized.");
        let result: FrameResult;
        try {
          result = await engine.detect(request.bitmap);
        } finally {
          request.bitmap.close();
        }
        reply({ id: request.id, type: "result", result });
      } else if (request.type === "configure") {
        if (!engine) throw new Error("Object detector is not initialized.");
        await engine.configure(request.settings);
        reply({ id: request.id, type: "result" });
      } else {
        statusSubscription?.();
        statusSubscription = undefined;
        await engine?.dispose();
        engine = undefined;
        reply({ id: request.id, type: "result" });
      }
    } catch (error) {
      reply({ id: request.id, type: "error", message: error instanceof Error ? error.message : "Object detection worker failed." });
    }
  })();
});
