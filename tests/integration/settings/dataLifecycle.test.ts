import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appDatabase } from "../../../src/data/db";
import { createProfile, deleteProfileCascade, updateProfile } from "../../../src/data/repositories/peopleRepository";
import { addEvents } from "../../../src/data/repositories/eventRepository";
import { saveTemplates } from "../../../src/data/repositories/templateRepository";
import { clearModelCache } from "../../../src/ai/engine/modelCache";
import { clearAllLocalData, resetDemoData } from "../../../src/features/settings/dataLifecycle";
import { seedDemoData } from "../../../src/data/seed/seedDemoData";
import { DEFAULT_VISION_SETTINGS } from "../../../src/config/vision";
import { InferenceLoop, stopActiveVision, type InferenceLoopDependencies } from "../../../src/features/vision/InferenceLoop";
import type { FrameResult } from "../../../src/ai/engine/types";
import type { VisionEngine } from "../../../src/ai/engine/types";
import type { NewDetectionEvent } from "../../../src/types/events";

const emptyFrame: FrameResult = { faces: [], objects: [], modelId: "unit", inferenceStartedAt: 1, inferenceFinishedAt: 2, warnings: [] };

async function makePrivateProfile() {
  return createProfile({ personId: "PRIVATE-001", name: "Private Person", consentRecordedAt: Date.now() });
}

describe("local data lifecycle controls", () => {
  beforeEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
    await appDatabase.open();
  });

  afterEach(async () => {
    await stopActiveVision();
    vi.restoreAllMocks();
    appDatabase.close();
    await appDatabase.delete();
  });

  it("resetDemoPreservesEnrolledPeopleAndTheirTemplates", async () => {
    const privatePerson = await makePrivateProfile();
    await seedDemoData();
    expect((await appDatabase.people.toArray()).some((person) => person.isDemo)).toBe(true);
    await resetDemoData();
    const profiles = await appDatabase.people.toArray();
    expect(profiles.some((person) => person.id === privatePerson.id)).toBe(true);
    expect(profiles.every((person) => person.isDemo)).toBe(false);
    expect((await appDatabase.events.toArray()).some((event) => event.isDemo)).toBe(true);
    expect((await appDatabase.templates.toArray()).some((template) => template.isDemo)).toBe(false);
  });

  it("clearAllStopsInflightInferenceBeforeDeletingAndCannotRecreateEvents", async () => {
    let finish!: (frame: FrameResult) => void;
    const pending = new Promise<FrameResult>((resolve) => { finish = resolve; });
    const stopped = vi.fn();
    const engine = {
      detect: vi.fn(() => pending),
      status: () => ({ state: "ready" as const, message: "ready", progress: 1, activeModels: [] }),
      similarity: () => 0.9,
    } as unknown as VisionEngine;
    const deps: InferenceLoopDependencies = {
      video: { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
      engine, settings: { ...DEFAULT_VISION_SETTINGS, inferenceIntervalMs: 500 }, mode: "fusion",
      onFrame: vi.fn(), listProfiles: vi.fn(async () => []), listTemplatesForPerson: vi.fn(async () => []),
      queryEvents: vi.fn(async () => []), addEvents: vi.fn(async (rows: NewDetectionEvent[]) => rows.map((row, index) => ({ ...row, id: `e${index}` }))),
      onStop: stopped,
    };
    const loop = new InferenceLoop(deps);
    await makePrivateProfile();
    await addEvents([{ timestamp: Date.now(), type: "object_detected", label: "Old event", detectorConfidence: 0.7, mode: "objects", isDemo: false }]);
    loop.start();
    await vi.waitFor(() => expect(engine.detect).toHaveBeenCalledOnce());
    const clearing = clearAllLocalData();
    expect(stopped).toHaveBeenCalledOnce();
    finish(emptyFrame);
    await clearing;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(deps.addEvents).not.toHaveBeenCalled();
    expect(await appDatabase.people.count()).toBe(0);
    expect(await appDatabase.templates.count()).toBe(0);
    expect(await appDatabase.events.count()).toBe(0);
    expect(await appDatabase.settings.count()).toBe(0);
  });

  it("cachedRecognitionCannotRestoreADeletedIdentityOrHistoryEvent", async () => {
    const profile = await makePrivateProfile();
    const descriptor = new Float32Array(1024).fill(0.25);
    await saveTemplates(profile.id, [{ descriptor, quality: 0.9, pose: "front", modelId: "unit" }]);
    const cachedTemplate = {
      id: "cached-template", personId: profile.id, descriptor, quality: 0.9, pose: "front",
      createdAt: Date.now(), modelId: "unit", isDemo: false,
    };
    const onFrame = vi.fn();
    const engine = {
      detect: vi.fn(async () => ({
        ...emptyFrame,
        faces: [{ box: { x: 0.2, y: 0.1, width: 0.2, height: 0.25 }, detectorConfidence: 0.94, descriptor }],
      })),
      status: () => ({ state: "ready" as const, message: "ready", progress: 1, activeModels: [] }),
      similarity: () => 0.95,
    } as unknown as VisionEngine;
    const loop = new InferenceLoop({
      video: { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
      engine,
      settings: { ...DEFAULT_VISION_SETTINGS, inferenceIntervalMs: 1000 },
      mode: "fusion",
      onFrame,
      listProfiles: async () => [profile],
      listTemplatesForPerson: async () => [cachedTemplate],
      queryEvents: async () => [],
      addEvents: async (rows) => {
        await deleteProfileCascade(profile.id);
        return addEvents(rows);
      },
      updateProfile,
    });

    loop.start();
    await vi.waitFor(() => expect(onFrame).toHaveBeenCalled());
    await loop.stop();
    const view = onFrame.mock.calls[0]![0];

    expect(view.faces[0]?.decision.status).toBe("unknown");
    expect(view.faces[0]?.profile).toBeUndefined();
    expect(view.eventDelta.some((event: { type: string }) => event.type === "person_recognized")).toBe(false);
    expect(await appDatabase.templates.count()).toBe(0);
    expect(await appDatabase.events.where("personId").equals(profile.id).count()).toBe(0);
  });

  it("clearModelCachePreservesPersonalDatabaseRows", async () => {
    const profile = await makePrivateProfile();
    const deleted: string[] = [];
    await clearModelCache({
      origin: "https://local.test", cacheStorage: { open: vi.fn(), delete: vi.fn(async (name) => { deleted.push(name); return true; }) },
      fetcher: fetch, digest: async () => "",
    });
    expect(deleted).toContain("visionid-model-assets-v1");
    expect(await appDatabase.people.get(profile.id)).toBeDefined();
  });
});
