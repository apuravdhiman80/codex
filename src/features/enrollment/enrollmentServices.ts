import { DEFAULT_VISION_SETTINGS } from "../../config/vision";
import { createVisionEngine } from "../../ai/worker/workerVisionEngine";
import { cameraService, type BrowserCameraService } from "../camera/cameraService";
import type { PersonProfile, CreatePersonInput, NewFaceTemplate, PersonProfilePatch, FaceTemplate } from "../../types/person";
import type { VisionEngine } from "../../ai/engine/types";
import type { CameraConstraints } from "../camera/cameraService";
import { createProfile, deleteProfileCascade, getProfile, listProfiles, updateProfile } from "../../data/repositories/peopleRepository";
import { listTemplatesForPerson, replaceTemplatesForPerson, saveTemplates } from "../../data/repositories/templateRepository";
import { queryEvents } from "../../data/repositories/eventRepository";
import type { DetectionEvent } from "../../types/events";
import type { VisionSettings, CameraFacingMode } from "../../types/vision";

export interface EnrollmentServices {
  camera: Pick<BrowserCameraService, "startCamera" | "stopCamera" | "subscribeToCameraStatus">;
  createEngine(settings?: VisionSettings): VisionEngine;
  createProfile(input: CreatePersonInput): Promise<PersonProfile>;
  saveTemplates(personId: string, templates: NewFaceTemplate[]): Promise<FaceTemplate[]>;
  replaceTemplates(personId: string, templates: NewFaceTemplate[]): Promise<FaceTemplate[]>;
  listProfiles(): Promise<PersonProfile[]>;
  getProfile(id: string): Promise<PersonProfile | undefined>;
  updateProfile(id: string, patch: PersonProfilePatch): Promise<PersonProfile>;
  deleteProfile(id: string): Promise<void>;
  listTemplatesForPerson(id: string): Promise<FaceTemplate[]>;
  queryPersonEvents(id: string): Promise<DetectionEvent[]>;
  captureFrame(video: HTMLVideoElement): Promise<ImageData>;
}

export async function captureVideoFrame(video: HTMLVideoElement): Promise<ImageData> {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) throw new Error("Camera frame is not ready. Hold still and retry.");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not read a camera frame for the quality check.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
  }
}

export const DEFAULT_ENROLLMENT_SERVICES: EnrollmentServices = {
  camera: cameraService,
  createEngine: (settings = DEFAULT_VISION_SETTINGS) => createVisionEngine(settings),
  createProfile,
  saveTemplates,
  replaceTemplates: replaceTemplatesForPerson,
  listProfiles,
  getProfile,
  updateProfile,
  deleteProfile: deleteProfileCascade,
  listTemplatesForPerson,
  queryPersonEvents: async (id) => queryEvents({ personId: id, limit: 500 }),
  captureFrame: captureVideoFrame,
};

export function resolveEnrollmentServices(
  overrides?: Partial<EnrollmentServices>,
): EnrollmentServices {
  return { ...DEFAULT_ENROLLMENT_SERVICES, ...overrides };
}

export function facingModeConstraints(mode: CameraFacingMode): CameraConstraints {
  return { facingMode: mode, width: 640, height: 480 };
}
