import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { appDatabase } from "../../../src/data/db";
import { addEvents } from "../../../src/data/repositories/eventRepository";
import { DetectionHistoryPage } from "../../../src/features/history/DetectionHistoryPage";

describe("detection history screen", () => {
  beforeEach(async () => { appDatabase.close(); await appDatabase.delete(); await appDatabase.open(); });
  afterEach(async () => { appDatabase.close(); await appDatabase.delete(); });

  it("filtersRecordedEventsAndShowsNonBiometricEventDetails", async () => {
    await addEvents([
      { timestamp: Date.now(), type: "object_detected", label: "Bottle", detectorConfidence: 0.93, boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, mode: "objects", isDemo: false },
      { timestamp: Date.now() - 1_000, type: "unknown_face", label: "Unknown person", detectorConfidence: 0.7, mode: "fusion", isDemo: false },
    ]);
    render(<DetectionHistoryPage />);
    expect(await screen.findByText("Bottle")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("View event details")[0]!);
    expect(screen.getByText(/bounding box \(normalized\)/i)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: /search detections/i }), { target: { value: "unknown" } });
    expect(screen.getByText("Unknown person")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Bottle")).not.toBeInTheDocument());
    expect(screen.queryByText(/descriptor|embedding|frame data/i)).not.toBeInTheDocument();
  });
});
