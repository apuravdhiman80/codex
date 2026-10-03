import type { BoundingBox, VisionMode } from "./vision";

export type DetectionEventType =
  | "face_detected"
  | "person_recognized"
  | "unknown_face"
  | "object_detected";

export interface DetectionEvent {
  id: string;
  timestamp: number;
  type: DetectionEventType;
  label: string;
  /** Internal PersonProfile.id; absent for unknown people and generic objects. */
  personId?: string;
  trackId?: string;
  /** Temporary COCO person-object track containing this face; never an identity. */
  associatedPersonTrackId?: string;
  detectorConfidence?: number;
  recognitionSimilarity?: number;
  boundingBox?: BoundingBox;
  mode: VisionMode;
  isDemo: boolean;
}

export type NewDetectionEvent = Omit<DetectionEvent, "id"> & { id?: string };

export interface EventQuery {
  from?: number;
  to?: number;
  type?: DetectionEventType;
  personId?: string;
  limit?: number;
}
