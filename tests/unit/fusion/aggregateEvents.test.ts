import { describe, expect, it } from "vitest";
import { associateFacePerson } from "../../../src/ai/fusion/associateFacePerson";
import { aggregateEvents } from "../../../src/ai/fusion/aggregateEvents";
import type { NewDetectionEvent } from "../../../src/types/events";

const event = (timestamp: number, confidence = 0.9): NewDetectionEvent => ({
  timestamp,
  type: "object_detected",
  label: "Bottle",
  trackId: "track-bottle-1",
  detectorConfidence: confidence,
  mode: "fusion",
  isDemo: false,
});

describe("vision fusion result helpers", () => {
  it("associatesOverlappingBoxes", () => {
    const person = { trackId: "person-track-1", box: { x: 0.1, y: 0.05, width: 0.4, height: 0.9 } };
    const face = { x: 0.2, y: 0.1, width: 0.15, height: 0.2 };

    expect(associateFacePerson(face, [person])).toBe("person-track-1");
    expect(associateFacePerson({ x: 0.8, y: 0.1, width: 0.1, height: 0.2 }, [person])).toBeUndefined();
  });

  it("leavesTheFaceUnassociatedWhenPersonBoxesAreEquallyLikely", () => {
    const face = { x: 0.3, y: 0.2, width: 0.1, height: 0.1 };
    const people = [
      { trackId: "person-a", box: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 } },
      { trackId: "person-b", box: { x: 0.2, y: 0.15, width: 0.4, height: 0.6 } },
    ];

    expect(associateFacePerson(face, people)).toBeUndefined();
  });

  it("deduplicatesEventsWithinTheConfiguredWindow", () => {
    const first = aggregateEvents([], [event(1000)]);
    const duplicate = aggregateEvents(first, [event(1500, 0.95)]);
    const later = aggregateEvents(first, [event(3000, 0.95)]);

    expect(first).toHaveLength(1);
    expect(duplicate).toEqual([]);
    expect(later).toHaveLength(1);
  });

  it("keepsDetectorAndRecognitionScoresOnSeparateEvents", () => {
    const object = event(1000);
    const person: NewDetectionEvent = {
      timestamp: 1000,
      type: "person_recognized",
      label: "Enrolled person",
      personId: "profile-1",
      recognitionSimilarity: 0.88,
      mode: "fusion",
      isDemo: false,
    };
    const combined = aggregateEvents([], [object, person]);

    expect(combined[0]).toHaveProperty("detectorConfidence");
    expect(combined[0]).not.toHaveProperty("recognitionSimilarity");
    expect(combined[1]).toHaveProperty("recognitionSimilarity");
    expect(combined[1]).not.toHaveProperty("detectorConfidence");
  });
});
