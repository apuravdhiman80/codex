import { normalizeVisionSettings } from "../../config/vision";
import { pruneEventsBefore } from "../../data/repositories/eventRepository";
import { getSettings, saveSettings } from "../../data/repositories/settingsRepository";
import type { VisionEngine } from "../../ai/engine/types";
import type { VisionSettings } from "../../types/vision";
import { configureActiveVision } from "../vision/InferenceLoop";
import { applyTheme } from "./theme";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function applySettings(input: unknown, engine?: Pick<VisionEngine, "configure">): Promise<VisionSettings> {
  const next = normalizeVisionSettings(input);
  const active = engine ? Promise.resolve(engine.configure(next)) : configureActiveVision(next);
  await active;
  const saved = await saveSettings(next);
  applyTheme(saved.theme);
  if (saved.eventRetentionDays > 0) {
    await pruneEventsBefore(Date.now() - saved.eventRetentionDays * DAY_MS);
  }
  return saved;
}

export async function currentSettings(): Promise<VisionSettings> {
  const settings = await getSettings();
  applyTheme(settings.theme);
  if (settings.eventRetentionDays > 0) {
    await pruneEventsBefore(Date.now() - settings.eventRetentionDays * DAY_MS);
  }
  return settings;
}
