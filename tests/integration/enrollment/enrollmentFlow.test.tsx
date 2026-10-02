import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { appDatabase } from "../../../src/data/db";
import { addEvents, queryEvents } from "../../../src/data/repositories/eventRepository";
import { createProfile, getProfile } from "../../../src/data/repositories/peopleRepository";
import { listTemplatesForPerson, saveTemplates } from "../../../src/data/repositories/templateRepository";
import { EnrollmentFlow } from "../../../src/features/enrollment/EnrollmentFlow";
import { EnrollmentPage } from "../../../src/features/enrollment/EnrollmentPage";
import { PersonProfilePage } from "../../../src/features/people/PersonProfilePage";
import type { EnrollmentServices } from "../../../src/features/enrollment/enrollmentServices";
import type { VisionEngine } from "../../../src/ai/engine/types";
import type { PersonProfile } from "../../../src/types/person";
import type { NewFaceTemplate } from "../../../src/types/person";

const payload = { version: 1 as const, personId: "P-ENROLL-1", name: "Asha Rao", role: "Student", department: "Vision" };
const now = Date.now();

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function makeProfile(id = "profile-1"): PersonProfile {
  return {
    id, personId: payload.personId, name: payload.name, role: payload.role, department: payload.department,
    email: "", phone: "", organization: "", metadata: {}, createdAt: now, updatedAt: now,
    consentRecordedAt: now, isDemo: false,
  };
}

function makeFrame(): ImageData {
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 170 : 90);
      const index = (y * width + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

function fakeServices(options: { poor?: boolean; profile?: PersonProfile } = {}) {
  const profile = options.profile ?? makeProfile();
  const video = { srcObject: null, play: vi.fn(async () => undefined) } as unknown as HTMLVideoElement;
  const stream = { getTracks: () => [] } as unknown as MediaStream;
  const session = { id: 1, stream, video, deviceId: "camera-1", active: true };
  let frameNumber = 0;
  const engine = {
    initialize: vi.fn(async () => undefined),
    detect: vi.fn(async () => {
      frameNumber += 1;
      const yaw = frameNumber === 2 ? -0.2 : frameNumber === 3 ? 0.2 : 0;
      return {
        faces: [{
          box: options.poor ? { x: 0.45, y: 0.45, width: 0.1, height: 0.1 } : { x: 0.25, y: 0.15, width: 0.5, height: 0.7 },
          detectorConfidence: 0.95,
          pose: { yaw, pitch: 0, roll: 0 },
          descriptor: new Float32Array(1024).fill(0.125),
        }],
        objects: [], modelId: "face-model-v1", inferenceStartedAt: frameNumber, inferenceFinishedAt: frameNumber + 10, warnings: [],
      };
    }),
    status: () => ({ state: "ready" as const, message: "Models ready", progress: 1, activeModels: ["Face"] }),
    configure: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
    similarity: vi.fn(() => 0.9),
    subscribeStatus: () => () => undefined,
  } as unknown as VisionEngine;
  const camera = {
    startCamera: vi.fn(async () => session),
    stopCamera: vi.fn((target?: typeof session) => { if (target) target.active = false; }),
    subscribeToCameraStatus: () => () => undefined,
  };
  const services: Partial<EnrollmentServices> = {
    camera,
    createEngine: () => engine,
    createProfile: vi.fn(async () => profile),
    saveTemplates: vi.fn(async (_personId, templates: NewFaceTemplate[]) => templates.map((item, index: number) => ({ ...item, id: `template-${index}`, personId: profile.id, createdAt: now, isDemo: false }))),
    replaceTemplates: vi.fn(async (_personId, templates: NewFaceTemplate[]) => templates.map((item, index: number) => ({ ...item, id: `template-${index}`, personId: profile.id, createdAt: now, isDemo: false }))),
    updateProfile: vi.fn(async (_personId, patch) => ({ ...profile, ...patch })),
    listProfiles: vi.fn(async () => []),
    listTemplatesForPerson: vi.fn(async () => []),
    captureFrame: vi.fn(async () => makeFrame()),
  };
  return { services, engine, camera, profile };
}

describe("opt-in enrollment flow", () => {
  beforeEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
    await appDatabase.open();
  });
  afterEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
  });

  it("qrPreviewRequiresExplicitSave", async () => {
    const user = userEvent.setup();
    const { services } = fakeServices();
    renderWithRouter(<EnrollmentPage services={services} />);

    await user.click(screen.getByText("Enter QR data manually"));
    fireEvent.change(screen.getByLabelText("Paste person QR JSON"), { target: { value: JSON.stringify({ version: 1, person_id: "P-ENROLL-1", name: "Asha Rao" }) } });
    await user.click(screen.getByRole("button", { name: "Validate QR data" }));

    expect(await screen.findByText(/review profile/i)).toBeInTheDocument();
    expect(services.createProfile).not.toHaveBeenCalled();
    expect(services.camera?.startCamera).not.toHaveBeenCalled();
  });

  it("consentPrecedesCapture", async () => {
    const user = userEvent.setup();
    const { services } = fakeServices();
    renderWithRouter(<EnrollmentFlow payload={payload} services={services} />);

    const save = screen.getByRole("button", { name: /save profile and continue/i });
    expect(save).toBeDisabled();
    expect(services.camera?.startCamera).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: /consent/i }));
    await user.click(save);

    expect(await screen.findByRole("button", { name: /start camera and capture samples/i })).toBeInTheDocument();
    expect(services.camera?.startCamera).not.toHaveBeenCalled();
  });

  it("storesAnOptionalPortraitOnlyWhenSelected", async () => {
    const user = userEvent.setup();
    const { services } = fakeServices();
    renderWithRouter(<EnrollmentFlow payload={payload} services={services} />);
    await user.click(screen.getByRole("checkbox", { name: /consented to local face enrollment/i }));
    await user.click(screen.getByRole("checkbox", { name: /optional profile portrait/i }));
    const portrait = new File([new Uint8Array([137, 80, 78, 71])], "portrait.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/choose portrait/i), { target: { files: [portrait] } });
    await user.click(screen.getByRole("button", { name: /save profile and continue/i }));

    await waitFor(() => expect(services.createProfile).toHaveBeenCalledOnce());
    expect(vi.mocked(services.createProfile!).mock.calls[0]![0].photoBlob).toBeInstanceOf(Blob);
  });

  it("rejectsPoorSampleAndOffersRetry", async () => {
    const user = userEvent.setup();
    const { services } = fakeServices({ poor: true });
    renderWithRouter(<EnrollmentFlow payload={payload} services={services} />);
    await user.click(screen.getByRole("checkbox", { name: /consent/i }));
    await user.click(screen.getByRole("button", { name: /save profile and continue/i }));
    await user.click(await screen.findByRole("button", { name: /start camera and capture samples/i }));
    await user.click(await screen.findByRole("button", { name: /capture front sample/i }));

    expect(await screen.findByText(/move closer/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /capture front sample/i })).toBeInTheDocument();
    expect(services.saveTemplates).not.toHaveBeenCalled();
  });

  it("storesOnlyQualityApprovedDescriptors", async () => {
    const user = userEvent.setup();
    const { services, engine } = fakeServices();
    renderWithRouter(<EnrollmentFlow payload={payload} services={services} />);
    await user.click(screen.getByRole("checkbox", { name: /consent/i }));
    await user.click(screen.getByRole("button", { name: /save profile and continue/i }));
    await user.click(await screen.findByRole("button", { name: /start camera and capture samples/i }));
    for (const prompt of ["front", "left", "right"]) {
      await user.click(await screen.findByRole("button", { name: new RegExp(`capture ${prompt} sample`, "i") }));
    }
    await user.click(await screen.findByRole("button", { name: /save 3 samples/i }));

    await waitFor(() => expect(services.saveTemplates).toHaveBeenCalledOnce());
    const saved = vi.mocked(services.saveTemplates!).mock.calls[0]![1];
    expect(saved).toHaveLength(3);
    expect(saved.every((template) => template.descriptor instanceof Float32Array && template.descriptor.length === 1024)).toBe(true);
    expect(saved.some((template) => "frame" in template || "photoBlob" in template)).toBe(false);
    expect(engine.detect).toHaveBeenCalledTimes(3);
  });

  it("cancellationReleasesCamera", async () => {
    const user = userEvent.setup();
    const { services, camera, engine } = fakeServices();
    const onCancel = vi.fn();
    renderWithRouter(<EnrollmentFlow payload={payload} services={services} onCancel={onCancel} />);
    await user.click(screen.getByRole("checkbox", { name: /consent/i }));
    await user.click(screen.getByRole("button", { name: /save profile and continue/i }));
    await user.click(await screen.findByRole("button", { name: /start camera and capture samples/i }));
    await user.click(await screen.findByRole("button", { name: /cancel enrollment/i }));

    expect(camera.stopCamera).toHaveBeenCalledOnce();
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("reEnrollmentRequiresConfirmation", async () => {
    const user = userEvent.setup();
    const profile = makeProfile();
    const { services } = fakeServices({ profile });
    renderWithRouter(<EnrollmentFlow existingProfile={profile} services={services} />);

    const begin = screen.getByRole("button", { name: /confirm re-enrollment/i });
    expect(begin).toBeDisabled();
    expect(services.camera?.startCamera).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: /renewed consent/i }));
    await user.click(begin);

    expect(await screen.findByRole("button", { name: /start camera and capture samples/i })).toBeInTheDocument();
    expect(services.replaceTemplates).not.toHaveBeenCalled();
  });
});

describe("people profile management", () => {
  beforeEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
    await appDatabase.open();
  });
  afterEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
  });

  it("editingUpdatesProfile", async () => {
    const user = userEvent.setup();
    const profile = await createProfile({ personId: "P-EDIT", name: "Nia Das", consentRecordedAt: Date.now() });
    renderWithRouter(<PersonProfilePage personId={profile.id} />);
    await user.click(await screen.findByRole("button", { name: /edit profile/i }));
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Nia Das Updated");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Nia Das Updated")).toBeInTheDocument();
    expect((await getProfile(profile.id))?.name).toBe("Nia Das Updated");
  });

  it("deletingProfileRemovesTemplatesAndEvents", async () => {
    const user = userEvent.setup();
    const profile = await createProfile({ personId: "P-DELETE", name: "Delete Me", consentRecordedAt: Date.now() });
    await saveTemplates(profile.id, [{
      descriptor: new Float32Array(1024).fill(0.125), quality: 0.9, pose: "front", modelId: "face-model-v1",
    }]);
    await addEvents([{
      timestamp: Date.now(), type: "person_recognized", label: "Delete Me", personId: profile.id,
      recognitionSimilarity: 0.9, mode: "fusion", isDemo: false,
    }]);
    renderWithRouter(<PersonProfilePage personId={profile.id} />);
    await user.click(await screen.findByRole("button", { name: /delete person/i }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(async () => {
      expect(await getProfile(profile.id)).toBeUndefined();
      expect(await listTemplatesForPerson(profile.id)).toEqual([]);
      expect(await queryEvents({ personId: profile.id })).toEqual([]);
    });
  });
});
