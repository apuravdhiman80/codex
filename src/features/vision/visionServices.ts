import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import { createObjectDetectionEngine } from "../../ai/worker/objectDetectionWorkerEngine";
import { cameraService, type BrowserCameraService } from "../camera/cameraService";
import { getSettings } from "../../data/repositories/settingsRepository";
import { listProfiles, updateProfile } from "../../data/repositories/peopleRepository";
import { listTemplatesForPerson } from "../../data/repositories/templateRepository";
import { queryEvents, addEvents } from "../../data/repositories/eventRepository";
import type { VisionEngine } from "../../ai/engine/types";
import type { PersonProfile, PersonProfilePatch, FaceTemplate } from "../../types/person";
import type { DetectionEvent, EventQuery, NewDetectionEvent } from "../../types/events";
import type { VisionMode, VisionSettings } from "../../types/vision";
import { createE2EVisionAdapters } from "./e2eVisionAdapters";

const e2eAdapters = import.meta.env.MODE === "e2e" && import.meta.env.VITE_E2E_TEST_ADAPTERS === "true"
  ? createE2EVisionAdapters()
  : undefined;

export interface VisionConsoleServices {
  camera: Pick<BrowserCameraService, "enumerateCameras" | "startCamera" | "stopCamera" | "subscribeToCameraStatus" | "status">;
  createEngine(settings: VisionSettings, mode?: VisionMode): VisionEngine;
  getSettings(): Promise<VisionSettings>;
  listProfiles(): Promise<PersonProfile[]>;
  listTemplatesForPerson(id: string): Promise<FaceTemplate[]>;
  queryEvents(query?: EventQuery): Promise<DetectionEvent[]>;
  addEvents(events: NewDetectionEvent[]): Promise<DetectionEvent[]>;
  updateProfile(id: string, patch: PersonProfilePatch): Promise<PersonProfile>;
  isTestAdapter?: boolean;
}

export const DEFAULT_VISION_CONSOLE_SERVICES: VisionConsoleServices = {
  camera: e2eAdapters?.camera ?? cameraService,
  createEngine: e2eAdapters?.createEngine ?? ((settings) => createObjectDetectionEngine(settings)),
  ...(e2eAdapters ? { isTestAdapter: true } : {}),
  getSettings: async () => (await getSettings()) ?? DEFAULT_VISION_SETTINGS,
  listProfiles,
  listTemplatesForPerson,
  queryEvents,
  addEvents,
  updateProfile,
};

export function resolveVisionConsoleServices(overrides?: Partial<VisionConsoleServices>): VisionConsoleServices {
  return { ...DEFAULT_VISION_CONSOLE_SERVICES, ...overrides };
}
