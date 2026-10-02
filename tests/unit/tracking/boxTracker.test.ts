import { describe, expect, it } from "vitest";
import { updateTracks, type Detection, type Track } from "../../../src/ai/tracking/boxTracker";

const detection = (x: number, label = "person"): Detection => ({
  type: "person",
  label,
  box: { x, y: 0.1, width: 0.2, height: 0.4 },
  detectorConfidence: 0.9,
});

describe("temporary object tracking", () => {
  it("keepsAStableTrackForNearbyDetections", () => {
    const first = updateTracks([], [detection(0.1)], 1000, { expiryMs: 1800, idFactory: () => "track-a" });
    const next = updateTracks(first, [detection(0.11)], 1200, { expiryMs: 1800, idFactory: () => "track-b" });

    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "track-a", firstSeenAt: 1000, lastSeenAt: 1200 });
  });

  it("expiresMissingTracks", () => {
    const first = updateTracks([], [detection(0.1)], 1000, { expiryMs: 1000, idFactory: () => "old-track" });
    const expired: Track[] = updateTracks(first, [], 2001, { expiryMs: 1000, idFactory: () => "unused" });

    expect(expired).toEqual([]);
  });

  it("doesNotReuseTracksAcrossDifferentLabels", () => {
    const first = updateTracks([], [detection(0.1)], 1000, { idFactory: () => "person-track" });
    const next = updateTracks(first, [detection(0.1, "cat")], 1100, { idFactory: () => "cat-track" });

    expect(next.map((track) => track.id)).toEqual(["person-track", "cat-track"]);
  });
});
