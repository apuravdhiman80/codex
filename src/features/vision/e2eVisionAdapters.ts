import type { FrameResult, ModelStatus, VisionEngine } from "../../ai/engine/types";
import type { CameraSession, CameraStatus } from "../camera/cameraService";
import type { ObjectResult } from "../../types/vision";
import type { VisionConsoleServices } from "./visionServices";

const TEST_MODEL_ID = "playwright-fixture-v1";

function isFixtureFailure(name: string): boolean {
  return new URLSearchParams(window.location.search).has(name);
}

class E2ECameraService {
  private statusValue: CameraStatus = { state: "idle", message: "Test camera is off." };
  private listeners = new Set<(status: CameraStatus) => void>();
  private current?: CameraSession;
  private permissionFailureConsumed = false;
  private nextId = 1;

  async enumerateCameras(): Promise<MediaDeviceInfo[]> { return []; }

  status(): CameraStatus { return this.statusValue; }

  subscribeToCameraStatus(listener: (status: CameraStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.statusValue);
    return () => this.listeners.delete(listener);
  }

  async startCamera(video: HTMLVideoElement): Promise<CameraSession> {
    this.stopCamera();
    this.publish({ state: "requesting", message: "Starting the Playwright test camera." });
    if (isFixtureFailure("e2eCameraDenied") && !this.permissionFailureConsumed) {
      this.permissionFailureConsumed = true;
      const status: CameraStatus = { state: "denied", message: "Camera access was denied by the Playwright test fixture." };
      this.publish(status);
      throw new DOMException(status.message, "NotAllowedError");
    }
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext("2d")?.fillRect(0, 0, canvas.width, canvas.height);
    const stream = canvas.captureStream(2);
    video.srcObject = stream;
    try {
      await video.play();
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      this.publish({ state: "unavailable", message: "The Playwright test video could not be started." });
      throw error;
    }
    const session: CameraSession = { id: this.nextId++, stream, video, deviceId: "playwright-test-camera", active: true };
    this.current = session;
    this.publish({ state: "active", message: "Playwright test camera active. Results are fixtures only.", deviceId: session.deviceId });
    return session;
  }

  stopCamera(session?: CameraSession): void {
    const target = session ?? this.current;
    if (!target?.active) return;
    target.active = false;
    target.stream.getTracks().forEach((track) => track.stop());
    if (target.video.srcObject === target.stream) target.video.srcObject = null;
    if (this.current === target) this.current = undefined;
    this.publish({ state: "idle", message: "Playwright test camera is off." });
  }

  private publish(status: CameraStatus): void {
    this.statusValue = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

class E2EVisionEngine implements VisionEngine {
  private modelStatus: ModelStatus = { state: "idle", message: "Test fixtures are inactive.", progress: 0, activeModels: [] };
  private modelFailureConsumed = false;

  async initialize(): Promise<void> {
    this.modelStatus = { state: "loading", message: "Loading Playwright-only fixture.", progress: 0.5, activeModels: ["Playwright fixture"] };
    if (isFixtureFailure("e2eModelError") && !this.modelFailureConsumed) {
      this.modelFailureConsumed = true;
      this.modelStatus = { ...this.modelStatus, state: "error", message: "Playwright fixture model failed once. Retry to continue." };
      throw new Error(this.modelStatus.message);
    }
    this.modelStatus = { state: "ready", message: "Playwright test fixture ready. No production model is running.", progress: 1, activeModels: ["Bottle fixture only"] };
  }

  async detect(): Promise<FrameResult> {
    const now = performance.now();
    const object: ObjectResult = { className: "bottle", modelClassId: 39, detectorConfidence: 0.94, box: { x: 0.3, y: 0.15, width: 0.32, height: 0.66 } };
    return { faces: [], objects: [object], modelId: TEST_MODEL_ID, inferenceStartedAt: now, inferenceFinishedAt: performance.now(), warnings: [] };
  }

  status(): ModelStatus { return this.modelStatus; }

  async configure(): Promise<void> {}

  async dispose(): Promise<void> { this.modelStatus = { state: "idle", message: "Test fixture stopped.", progress: 0, activeModels: [] }; }

  similarity(): number { return 0; }
}

export function createE2EVisionAdapters(): Pick<VisionConsoleServices, "camera" | "createEngine"> & { isTestAdapter: true } {
  return { camera: new E2ECameraService(), createEngine: () => new E2EVisionEngine(), isTestAdapter: true };
}
