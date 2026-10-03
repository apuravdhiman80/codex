import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VISION_SETTINGS } from "../../../src/config/vision";
import { appDatabase } from "../../../src/data/db";
import { createProfile } from "../../../src/data/repositories/peopleRepository";
import { getSettings } from "../../../src/data/repositories/settingsRepository";
import { queryEvents } from "../../../src/data/repositories/eventRepository";
import { addEvents } from "../../../src/data/repositories/eventRepository";
import { applySettings } from "../../../src/features/settings/settingsService";
import { filterEvents } from "../../../src/features/history/historyFilters";

describe("settings and history preferences", () => {
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

  it("eventFiltersAndRetention", async () => {
    const now = Date.now();
    const profile = await createProfile({ personId: "HISTORY-001", name: "Asha Rao", consentRecordedAt: now });
    await addEvents([
      { timestamp: now - 10_000, type: "person_recognized", label: "Asha Rao", personId: profile.id, detectorConfidence: 0.95, recognitionSimilarity: 0.84, mode: "fusion", isDemo: false },
      { timestamp: now - 5_000, type: "object_detected", label: "Bottle", detectorConfidence: 0.9, mode: "objects", isDemo: true },
      { timestamp: now, type: "unknown_face", label: "Unknown person", detectorConfidence: 0.7, mode: "fusion", isDemo: false },
      { timestamp: now - 2 * 24 * 60 * 60 * 1000, type: "object_detected", label: "Old chair", detectorConfidence: 0.8, mode: "objects", isDemo: false },
    ]);
    const rows = await queryEvents({ limit: 20 });
    expect(filterEvents(rows, { search: "bott", kind: "all", demo: "demo" })).toHaveLength(1);
    expect(filterEvents(rows, { search: "", kind: "people", demo: "all", from: now - 8_000 })).toHaveLength(1);
    await applySettings({ ...DEFAULT_VISION_SETTINGS, eventRetentionDays: 1 }, { configure: vi.fn(async () => undefined) } as never);
    expect(await appDatabase.events.count()).toBe(3);
    await applySettings({ ...DEFAULT_VISION_SETTINGS, eventRetentionDays: 0 }, { configure: vi.fn(async () => undefined) } as never);
    expect(await getSettings()).toMatchObject({ eventRetentionDays: 0 });
  });

  it("settingsReconfigureEngineAndPersistValidatedConfiguration", async () => {
    const engine = { configure: vi.fn(async () => undefined) };
    const next = { ...DEFAULT_VISION_SETTINGS, recognitionThreshold: 0.71, objectThreshold: 0.63, inferenceIntervalMs: 300 };
    await expect(applySettings(next, engine)).resolves.toMatchObject(next);
    expect(engine.configure).toHaveBeenCalledOnce();
    expect(engine.configure).toHaveBeenCalledWith(expect.objectContaining({ recognitionThreshold: 0.71, objectThreshold: 0.63, inferenceIntervalMs: 300 }));
    expect(await getSettings()).toMatchObject({ recognitionThreshold: 0.71, objectThreshold: 0.63, inferenceIntervalMs: 300 });
    await expect(applySettings({ ...next, recognitionThreshold: 99 }, engine)).resolves.toMatchObject({ recognitionThreshold: 0.9 });
  });
});
