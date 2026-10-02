import { normalizeVisionSettings } from "../../config/vision";
import type { PersistedVisionSettings, VisionSettings } from "../../types/vision";
import { appDatabase, DataLayerError, ensureDefaultSettings, ensureDatabaseReady, toDataLayerError } from "../db";

export async function getSettings(): Promise<VisionSettings> {
  try {
    const stored = await ensureDefaultSettings();
    return normalizeVisionSettings(stored);
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function saveSettings(settings: unknown): Promise<VisionSettings> {
  let normalized: VisionSettings;
  try {
    normalized = normalizeVisionSettings(settings);
  } catch (error) {
    throw new DataLayerError("invalid", error instanceof Error ? error.message : "Settings are invalid.", error);
  }
  await ensureDatabaseReady();
  try {
    const row: PersistedVisionSettings = { id: "current", ...normalized };
    await appDatabase.settings.put(row);
    return normalized;
  } catch (error) {
    throw toDataLayerError(error);
  }
}
