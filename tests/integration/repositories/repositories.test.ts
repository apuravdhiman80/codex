import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appDatabase } from "../../../src/data/db";
import { createProfile, deleteProfileCascade } from "../../../src/data/repositories/peopleRepository";
import { addEvents } from "../../../src/data/repositories/eventRepository";
import { saveTemplates } from "../../../src/data/repositories/templateRepository";
import { getSettings } from "../../../src/data/repositories/settingsRepository";

describe("local repositories", () => {
  beforeEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
    await appDatabase.open();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    appDatabase.close();
    await appDatabase.delete();
  });

  it("deleteProfileCascadeRemovesLinkedRows", async () => {
    const profile = await createProfile({
      personId: "P-001",
      name: "Demo Person",
      role: "Visitor",
      department: "",
      email: "",
      phone: "",
      organization: "",
      metadata: {},
      consentRecordedAt: Date.now(),
      isDemo: false,
    });
    await saveTemplates(profile.id, [
      {
        descriptor: new Float32Array(1024).fill(0.25),
        quality: 0.9,
        pose: "front",
        modelId: "human-face-v1",
      },
    ]);
    await addEvents([
      {
        timestamp: Date.now(),
        type: "person_recognized",
        label: "Demo Person",
        personId: profile.id,
        detectorConfidence: 0.92,
        recognitionSimilarity: 0.87,
        mode: "fusion",
        isDemo: false,
      },
    ]);

    await deleteProfileCascade(profile.id);

    expect(await appDatabase.people.count()).toBe(0);
    expect(await appDatabase.templates.count()).toBe(0);
    expect(await appDatabase.events.count()).toBe(0);
  });

  it("reportsIndexedDbOpenFailure", async () => {
    appDatabase.close();
    vi.spyOn(appDatabase, "open").mockRejectedValue(
      new DOMException("Storage is blocked", "SecurityError"),
    );

    await expect(getSettings()).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});
