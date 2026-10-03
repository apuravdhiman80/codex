import type { DetectionEvent } from "../../types/events";
import type { PersonProfile } from "../../types/person";
import { normalizePersonId } from "../../utils/personId";

const seedTimestamp = Date.now();

/** Entirely fictional records; intentionally no portraits, biometric templates, or contact data. */
export const DEMO_PEOPLE: readonly PersonProfile[] = [
  { id: "demo-person-01", personId: "DEMO-01", personIdCanonical: normalizePersonId("DEMO-01"), name: "Demo User 01", role: "Visitor", department: "Demo Lab", organization: "VisionID Sample", metadata: {}, createdAt: seedTimestamp, updatedAt: seedTimestamp, consentRecordedAt: seedTimestamp, isDemo: true },
  { id: "demo-person-02", personId: "DEMO-02", personIdCanonical: normalizePersonId("DEMO-02"), name: "Demo User 02", role: "Student", department: "Computer Vision", organization: "VisionID Sample", metadata: {}, createdAt: seedTimestamp, updatedAt: seedTimestamp, consentRecordedAt: seedTimestamp, isDemo: true },
  { id: "demo-person-03", personId: "DEMO-03", personIdCanonical: normalizePersonId("DEMO-03"), name: "Demo User 03", role: "Researcher", department: "AI Systems", organization: "VisionID Sample", metadata: {}, createdAt: seedTimestamp, updatedAt: seedTimestamp, consentRecordedAt: seedTimestamp, isDemo: true },
];

export function createDemoEvents(now = Date.now()): Array<Omit<DetectionEvent, "id">> {
  return [
    { timestamp: now - 5 * 60_000, type: "person_recognized", label: "Demo User 01", personId: "demo-person-01", trackId: "demo-face-01", detectorConfidence: 0.97, recognitionSimilarity: 0.86, boundingBox: { x: 0.27, y: 0.12, width: 0.19, height: 0.36 }, mode: "fusion", isDemo: true },
    { timestamp: now - 4 * 60_000, type: "object_detected", label: "Bottle", trackId: "demo-object-01", detectorConfidence: 0.91, boundingBox: { x: 0.56, y: 0.42, width: 0.1, height: 0.22 }, mode: "fusion", isDemo: true },
    { timestamp: now - 2 * 60_000, type: "unknown_face", label: "Unknown person", trackId: "demo-face-02", detectorConfidence: 0.89, boundingBox: { x: 0.68, y: 0.14, width: 0.18, height: 0.35 }, mode: "recognition", isDemo: true },
    { timestamp: now - 60_000, type: "object_detected", label: "Laptop", trackId: "demo-object-02", detectorConfidence: 0.94, boundingBox: { x: 0.36, y: 0.58, width: 0.34, height: 0.2 }, mode: "objects", isDemo: true },
  ];
}
