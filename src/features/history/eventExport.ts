import type { DetectionEvent } from "../../types/events";
import type { PersonProfile } from "../../types/person";

/** This explicit projection is the export allowlist. Never serialize DB rows directly. */
export interface SafeEventExport {
  id: string;
  timestamp: number;
  timestampIso: string;
  type: DetectionEvent["type"];
  label: string;
  personId?: string;
  trackId?: string;
  associatedPersonTrackId?: string;
  detectorConfidence?: number;
  recognitionSimilarity?: number;
  boundingBox?: DetectionEvent["boundingBox"];
  mode: DetectionEvent["mode"];
  isDemo: boolean;
}

export function toSafeEventExport(event: DetectionEvent): SafeEventExport {
  return {
    id: event.id,
    timestamp: event.timestamp,
    timestampIso: new Date(event.timestamp).toISOString(),
    type: event.type,
    label: event.label,
    ...(event.personId ? { personId: event.personId } : {}),
    ...(event.trackId ? { trackId: event.trackId } : {}),
    ...(event.associatedPersonTrackId ? { associatedPersonTrackId: event.associatedPersonTrackId } : {}),
    ...(event.detectorConfidence !== undefined ? { detectorConfidence: event.detectorConfidence } : {}),
    ...(event.recognitionSimilarity !== undefined ? { recognitionSimilarity: event.recognitionSimilarity } : {}),
    ...(event.boundingBox ? { boundingBox: { ...event.boundingBox } } : {}),
    mode: event.mode,
    isDemo: event.isDemo,
  };
}

export function exportEventsJson(events: readonly DetectionEvent[]): string {
  return JSON.stringify(events.map(toSafeEventExport), null, 2);
}

const CSV_COLUMNS: ReadonlyArray<keyof SafeEventExport | "boxX" | "boxY" | "boxWidth" | "boxHeight"> = [
  "id", "timestampIso", "type", "label", "personId", "trackId", "associatedPersonTrackId", "detectorConfidence",
  "recognitionSimilarity", "boxX", "boxY", "boxWidth", "boxHeight", "mode", "isDemo",
];

function csvCell(value: unknown): string {
  let text = value === undefined || value === null ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportEventsCsv(events: readonly DetectionEvent[]): string {
  const rows = events.map(toSafeEventExport);
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((row) => CSV_COLUMNS.map((column) => {
    if (column === "boxX" || column === "boxY" || column === "boxWidth" || column === "boxHeight") {
      const key = ({ boxX: "x", boxY: "y", boxWidth: "width", boxHeight: "height" } as const)[column];
      return csvCell(row.boundingBox?.[key]);
    }
    return csvCell(row[column]);
  }).join(","));
  return [header, ...body].join("\r\n");
}

export function exportPeopleJson(people: readonly PersonProfile[]): string {
  const rows = people.map((person) => ({
    id: person.id,
    personId: person.personId,
    name: person.name,
    role: person.role,
    department: person.department,
    email: person.email ?? "",
    phone: person.phone ?? "",
    organization: person.organization ?? "",
    metadata: { ...person.metadata },
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    consentRecordedAt: person.consentRecordedAt,
    ...(person.lastDetectedAt ? { lastDetectedAt: person.lastDetectedAt } : {}),
    isDemo: person.isDemo,
  }));
  return JSON.stringify(rows, null, 2);
}

export interface SessionReport {
  generatedAt: number;
  range: { from?: number; to?: number };
  totalEvents: number;
  demoEvents: number;
  liveEvents: number;
  recognizedPeople: number;
  recognizedEvents: number;
  unknownFaces: number;
  facesDetected: number;
  objectsDetected: number;
  averageDetectorConfidence: number | null;
  averageRecognitionSimilarity: number | null;
  modes: Record<DetectionEvent["mode"], number>;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function exportSessionReport(
  events: readonly DetectionEvent[],
  options: { generatedAt?: number; from?: number; to?: number } = {},
): SessionReport {
  const report: SessionReport = {
    generatedAt: options.generatedAt ?? Date.now(),
    range: { ...(options.from !== undefined ? { from: options.from } : {}), ...(options.to !== undefined ? { to: options.to } : {}) },
    totalEvents: events.length,
    demoEvents: events.filter((event) => event.isDemo).length,
    liveEvents: events.filter((event) => !event.isDemo).length,
    recognizedPeople: new Set(events.flatMap((event) => event.type === "person_recognized" && event.personId ? [event.personId] : [])).size,
    recognizedEvents: events.filter((event) => event.type === "person_recognized").length,
    unknownFaces: events.filter((event) => event.type === "unknown_face").length,
    facesDetected: events.filter((event) => event.type === "person_recognized" || event.type === "unknown_face" || event.type === "face_detected").length,
    objectsDetected: events.filter((event) => event.type === "object_detected").length,
    averageDetectorConfidence: average(events.flatMap((event) => event.detectorConfidence === undefined ? [] : [event.detectorConfidence])),
    averageRecognitionSimilarity: average(events.flatMap((event) => event.recognitionSimilarity === undefined ? [] : [event.recognitionSimilarity])),
    modes: { fusion: 0, objects: 0, recognition: 0 },
  };
  for (const event of events) report.modes[event.mode] += 1;
  return report;
}
