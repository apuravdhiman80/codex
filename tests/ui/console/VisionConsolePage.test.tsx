import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VisionConsolePage } from "../../../src/features/vision/VisionConsolePage";
import type { VisionConsoleServices } from "../../../src/features/vision/visionServices";
import type { VisionEngine } from "../../../src/ai/engine/types";
import type { NewDetectionEvent } from "../../../src/types/events";
import type { FrameResult } from "../../../src/ai/engine/types";
import type { PersonProfile, FaceTemplate } from "../../../src/types/person";
import type { CameraSession } from "../../../src/features/camera/cameraService";

function makeServices(frame?: FrameResult, profiles: PersonProfile[] = [], templates: FaceTemplate[] = [], cameraStart?: () => Promise<CameraSession>): Partial<VisionConsoleServices> {
  const engine = {
    initialize: vi.fn(async () => undefined),
    detect: vi.fn(async () => frame ?? { faces: [], objects: [], modelId: "face-model-v1", inferenceStartedAt: 1, inferenceFinishedAt: 5, warnings: [] }),
    status: () => ({ state: "ready" as const, message: "AI engine ready", progress: 1, activeModels: ["Face", "Object"] }),
    configure: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
    similarity: vi.fn(() => 0.9),
  } as unknown as VisionEngine;
  const session = { id: 1, stream: { getTracks: () => [] }, video: {} as HTMLVideoElement, deviceId: "camera-test", active: true };
  return {
    camera: {
      startCamera: vi.fn(async () => cameraStart ? await cameraStart() : session),
      stopCamera: vi.fn((target) => { if (target) target.active = false; }),
      subscribeToCameraStatus: vi.fn((listener) => { listener({ state: "idle", message: "Camera is off." }); return () => undefined; }),
      enumerateCameras: vi.fn(async () => []),
    } as unknown as VisionConsoleServices["camera"],
    createEngine: () => engine,
    getSettings: vi.fn(async () => ({ ...DEFAULT_VISION_SETTINGS })),
    listProfiles: vi.fn(async () => profiles),
    listTemplatesForPerson: vi.fn(async () => templates),
    queryEvents: vi.fn(async () => []),
    addEvents: vi.fn(async (events: NewDetectionEvent[]) => events.map((event, index) => ({ ...event, id: `e-${index}` }))),
  };
}

import { DEFAULT_VISION_SETTINGS } from "../../../src/config/vision";

describe("vision fusion console", () => {
  afterEach(() => vi.restoreAllMocks());

  it("showsAnActiveLocalCameraAndMeasuredEngineStatus", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ clearRect: vi.fn(), setTransform: vi.fn() } as never);
    render(<VisionConsolePage services={makeServices()} />);
    expect(screen.getByRole("heading", { name: /vision fusion console/i })).toBeInTheDocument();
    const start = await screen.findByRole("button", { name: /start vision/i });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    expect(await screen.findAllByText(/camera active/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/ai engine ready/i)).not.toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /stop vision/i }));
  });

  it("rendersEmptyResultsWhenEngineReturnsNone", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ clearRect: vi.fn(), setTransform: vi.fn() } as never);
    render(<VisionConsolePage services={makeServices()} />);
    const start = await screen.findByRole("button", { name: /start vision/i });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    expect(await screen.findByText(/no current detections/i)).toBeInTheDocument();
    expect(screen.queryByText(/person recognized/i)).not.toBeInTheDocument();
  });

  it("showsRecognizedAndUnknownFacesAsSeparateResults", async () => {
    const user = userEvent.setup();
    const descriptor = new Float32Array(1024).fill(0.1);
    const profile: PersonProfile = {
      id: "local-profile-1", personId: "P001", name: "Asha Rao", role: "Student", department: "Vision",
      metadata: {}, createdAt: 1, updatedAt: 1, consentRecordedAt: 1, isDemo: false,
    };
    const template: FaceTemplate = {
      id: "sample-1", personId: profile.id, descriptor: new Float32Array(descriptor), quality: 0.95,
      pose: "front", createdAt: 1, modelId: "face-model-v1", isDemo: false,
    };
    const frame: FrameResult = {
      faces: [
        { box: { x: 0.1, y: 0.15, width: 0.2, height: 0.3 }, detectorConfidence: 0.95, descriptor },
        { box: { x: 0.6, y: 0.15, width: 0.2, height: 0.3 }, detectorConfidence: 0.88 },
      ],
      objects: [], modelId: "face-model-v1", inferenceStartedAt: 5, inferenceFinishedAt: 15, warnings: [],
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ clearRect: vi.fn(), setTransform: vi.fn(), strokeRect: vi.fn(), measureText: vi.fn(() => ({ width: 100 })), fillRect: vi.fn(), fillText: vi.fn() } as never);
    render(<VisionConsolePage services={makeServices(frame, [profile], [template])} />);
    const start = await screen.findByRole("button", { name: /start vision/i });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Unknown person")).toBeInTheDocument();
    expect(screen.getByText(/identity similarity/i)).toBeInTheDocument();
    expect(screen.getByText(/face detector/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /stop vision/i }));
  });

  it("showsCameraPermissionFailureAndLeavesRetryAvailable", async () => {
    const user = userEvent.setup();
    const denied = Object.assign(new Error("Camera permission was denied."), { name: "NotAllowedError" });
    render(<VisionConsolePage services={makeServices(undefined, [], [], async () => { throw denied; })} />);
    const start = await screen.findByRole("button", { name: /start vision/i });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    expect(await screen.findByRole("alert")).toHaveTextContent(/camera permission was denied/i);
    expect(screen.getByRole("button", { name: /start vision/i })).toBeEnabled();
  });
});
