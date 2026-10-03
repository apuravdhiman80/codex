import Dexie, { type Table } from "dexie";
import { DEFAULT_VISION_SETTINGS, normalizeVisionSettings } from "../config/vision";
import type { DetectionEvent } from "../types/events";
import type { FaceTemplate, PersonProfile } from "../types/person";
import type { PersistedVisionSettings, VisionSettings } from "../types/vision";
import { CURRENT_SCHEMA_VERSION, migrateSettingsRecord } from "./migrations";
import { normalizePersonId } from "../utils/personId";

export const APP_DATABASE_NAME = "visionid-ai-local";

export type DataLayerErrorCode = "unavailable" | "quota" | "conflict" | "not_found" | "invalid";

export class DataLayerError extends Error {
  readonly code: DataLayerErrorCode;
  readonly causeValue: unknown;

  constructor(code: DataLayerErrorCode, message: string, causeValue?: unknown) {
    super(message);
    this.name = "DataLayerError";
    this.code = code;
    this.causeValue = causeValue;
  }
}

export function toDataLayerError(error: unknown): DataLayerError {
  if (error instanceof DataLayerError) return error;
  const name = error instanceof DOMException ? error.name : "";
  if (name === "QuotaExceededError") {
    return new DataLayerError("quota", "Browser storage is full. Remove local data or free space and retry.", error);
  }
  if (name === "ConstraintError") {
    return new DataLayerError("conflict", "A record with that identifier already exists.", error);
  }
  if (name === "DataError" || name === "TypeError") {
    return new DataLayerError("invalid", "The local record could not be validated.", error);
  }
  if (error instanceof Error) {
    return new DataLayerError("invalid", error.message, error);
  }
  return new DataLayerError(
    "unavailable",
    "Local browser storage is unavailable. Check site storage permissions and retry.",
    error,
  );
}

export class VisionDatabase extends Dexie {
  people!: Table<PersonProfile, string>;
  templates!: Table<FaceTemplate, string>;
  events!: Table<DetectionEvent, string>;
  settings!: Table<PersistedVisionSettings, string>;

  constructor(name = APP_DATABASE_NAME) {
    super(name);
    this.version(1).stores({
      people: "id,&personId,name,role,department,createdAt,lastDetectedAt,isDemo",
      templates: "id,personId,createdAt,modelId,isDemo",
      events: "id,timestamp,type,personId,trackId,isDemo",
      settings: "id",
    });
    this.version(2)
      .stores({
        people: "id,&personId,name,role,department,createdAt,lastDetectedAt,isDemo",
        templates: "id,personId,createdAt,modelId,isDemo",
        events: "id,timestamp,type,personId,trackId,isDemo",
        settings: "id",
      })
      .upgrade(async (transaction) => {
        const table = transaction.table("settings");
        const legacyRows = await table.toArray() as Array<Record<string, unknown>>;
        await table.clear();
        const legacySettings = legacyRows.find((row) =>
          row.id === "current" || row.id === "vision" || row.id === "settings",
        );
        if (legacySettings) {
          await table.put(migrateSettingsRecord(legacySettings));
        } else {
          await table.put({ id: "current", ...normalizeVisionSettings(DEFAULT_VISION_SETTINGS) });
        }
      });
    this.version(CURRENT_SCHEMA_VERSION)
      .stores({
        people: "id,&personId,personIdCanonical,name,role,department,createdAt,lastDetectedAt,isDemo",
        templates: "id,personId,createdAt,modelId,isDemo",
        events: "id,timestamp,type,personId,trackId,isDemo",
        settings: "id",
      })
      .upgrade(async (transaction) => {
        const table = transaction.table("people");
        const rows = await table.toArray() as Array<Record<string, unknown>>;
        await Promise.all(rows.map((row) => table.update(String(row.id), {
          personIdCanonical: typeof row.personId === "string" && row.personId.trim()
            ? normalizePersonId(row.personId)
            : `LEGACY-${String(row.id)}`,
        })));
      });
  }
}

export const appDatabase = new VisionDatabase();

export async function ensureDatabaseReady(database: VisionDatabase = appDatabase): Promise<void> {
  if (database.isOpen()) return;
  try {
    await database.open();
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  throw new DataLayerError("unavailable", "Secure local identifiers are unavailable in this browser.");
}

export async function ensureDefaultSettings(): Promise<PersistedVisionSettings> {
  await ensureDatabaseReady();
  try {
    const existing = await appDatabase.settings.get("current");
    if (existing) return existing;
    const settings: PersistedVisionSettings = {
      id: "current",
      ...normalizeVisionSettings(DEFAULT_VISION_SETTINGS),
    };
    await appDatabase.settings.put(settings);
    return settings;
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export type { VisionSettings };
