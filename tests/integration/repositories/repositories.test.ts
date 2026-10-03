import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appDatabase } from "../../../src/data/db";
import { createProfile, deleteProfileCascade, updateProfile } from "../../../src/data/repositories/peopleRepository";
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

  it("savesFaceTemplatesInOneReadWriteTransactionWithItsProfile", async () => {
    const profile = await createProfile({ personId: "RACE-001", name: "Race Person", consentRecordedAt: Date.now() });
    const transaction = vi.spyOn(appDatabase, "transaction");
    await saveTemplates(profile.id, [{
      descriptor: new Float32Array(1024).fill(0.25), quality: 0.9, pose: "front", modelId: "human-face-v1",
    }]);
    expect(transaction).toHaveBeenCalledWith("rw", appDatabase.people, appDatabase.templates, expect.any(Function));
    expect(await appDatabase.templates.where("personId").equals(profile.id).count()).toBe(1);
  });

  it("doesNotPersistRecognizedEventsForDeletedProfiles", async () => {
    const rows = await addEvents([{
      timestamp: Date.now(), type: "person_recognized", label: "Deleted Person", personId: "deleted-profile",
      detectorConfidence: 0.9, recognitionSimilarity: 0.9, mode: "fusion", isDemo: false,
    }]);

    expect(rows).toEqual([]);
    expect(await appDatabase.events.count()).toBe(0);
  });

  it("rejectsPersonIdsThatDifferOnlyByCaseOrUnicodeNormalization", async () => {
    await createProfile({ personId: "Café-01", name: "First", consentRecordedAt: Date.now() });

    await expect(createProfile({ personId: "cafe\u0301-01", name: "Duplicate", consentRecordedAt: Date.now() }))
      .rejects.toMatchObject({ code: "conflict" });
  });

  it("serializesConcurrentCaseVariantProfileCreates", async () => {
    const results = await Promise.allSettled([
      createProfile({ personId: "Parallel-01", name: "First", consentRecordedAt: Date.now() }),
      createProfile({ personId: "parallel-01", name: "Second", consentRecordedAt: Date.now() }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("rejectsChangingAnExistingProfileToAnotherProfilesCanonicalId", async () => {
    await createProfile({ personId: "UPDATE-01", name: "First", consentRecordedAt: Date.now() });
    const second = await createProfile({ personId: "UPDATE-02", name: "Second", consentRecordedAt: Date.now() });

    await expect(updateProfile(second.id, { personId: "update-01" })).rejects.toMatchObject({ code: "conflict" });
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
