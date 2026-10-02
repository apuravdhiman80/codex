import { describe, expect, it } from "vitest";
import { exportEventsCsv, exportEventsJson, exportPeopleJson, exportSessionReport } from "../../../src/features/history/eventExport";
import type { DetectionEvent } from "../../../src/types/events";
import type { PersonProfile } from "../../../src/types/person";

const events: DetectionEvent[] = [
  { id: "e1", timestamp: 1_800_000_000_000, type: "person_recognized", label: "=HYPERLINK(\"bad\")", personId: "p1", trackId: "face-1", detectorConfidence: 0.92, recognitionSimilarity: 0.81, boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, mode: "fusion", isDemo: false },
  { id: "e2", timestamp: 1_800_000_001_000, type: "object_detected", label: "Bottle", detectorConfidence: 0.8, mode: "objects", isDemo: true },
  { id: "e3", timestamp: 1_800_000_002_000, type: "unknown_face", label: "Unknown person", detectorConfidence: 0.7, mode: "fusion", isDemo: false },
];

describe("privacy-safe history exports", () => {
  it("csvEscapesUserTextAndPreventsSpreadsheetFormulaExecution", () => {
    const csv = exportEventsCsv(events);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("Bottle");
    expect(csv.split("\r\n")).toHaveLength(4);
    expect(csv).toContain('"');
  });

  it("exportsOmitBiometricsRawFramesAndProfilePhoto", () => {
    const eventJson = exportEventsJson(events);
    expect(eventJson).toContain('"recognitionSimilarity": 0.81');
    expect(eventJson).not.toMatch(/descriptor|embedding|frame|imageData|qrPayload/iu);
    const person: PersonProfile & { photoBlob: Blob } = {
      id: "p1", personId: "P001", name: "Example", role: "Student", department: "Vision", metadata: {},
      photoBlob: new Blob(["private portrait"]), createdAt: 1, updatedAt: 1, consentRecordedAt: 1, isDemo: false,
    };
    const peopleJson = exportPeopleJson([person]);
    expect(peopleJson).toContain("Example");
    expect(peopleJson).not.toMatch(/photoBlob|private portrait|descriptor|embedding/iu);
  });

  it("exportsSessionSummaryWithoutBiometricsAndKeepsScoresSeparate", () => {
    const report = exportSessionReport(events, { generatedAt: 1_800_000_003_000 });
    expect(report).toMatchObject({ totalEvents: 3, demoEvents: 1, recognizedPeople: 1, objectsDetected: 1, unknownFaces: 1 });
    expect(report.averageDetectorConfidence).toBeCloseTo(0.8067, 3);
    expect(report.averageRecognitionSimilarity).toBe(0.81);
    expect(JSON.stringify(report)).not.toMatch(/descriptor|embedding|frame|photo/iu);
  });
});
