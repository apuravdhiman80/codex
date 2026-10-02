import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import { createVisionEngine } from "../../ai/worker/workerVisionEngine";
import { cameraService, type BrowserCameraService } from "../camera/cameraService";
import { getSettings } from "../../data/repositories/settingsRepository";
import { listProfiles, updateProfile } from "../../data/repositories/peopleRepository";
import { listTemplatesForPerson } from "../../data/repositories/templateRepository";
import { queryEvents, addEvents } from "../../data/repositories/eventRepository";
import type { VisionEngine } from "../../ai/engine/types";
import type { PersonProfile, PersonProfilePatch, FaceTemplate } from "../../types/person";
import type { DetectionEvent, EventQuery, NewDetectionEvent } from "../../types/events";
import type { VisionSettings } from "../../types/vision";

export interface VisionConsoleServices {
  camera: Pick<BrowserCameraService, "enumerateCameras" | "startCamera" | "stopCamera" | "subscribeToCameraStatus" | "status">;
  createEngine(settings: VisionSettings): VisionEngine;
  getSettings(): Promise<VisionSettings>;
  listProfiles(): Promise<PersonProfile[]>;
  listTemplatesForPerson(id: string): Promise<FaceTemplate[]>;
  queryEvents(query?: EventQuery): Promise<DetectionEvent[]>;
  addEvents(events: NewDetectionEvent[]): Promise<DetectionEvent[]>;
  updateProfile(id: string, patch: PersonProfilePatch): Promise<PersonProfile>;
}

export const DEFAULT_VISION_CONSOLE_SERVICES: VisionConsoleServices = {
  camera: cameraService,
  createEngine: (settings) => createVisionEngine(settings),
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
