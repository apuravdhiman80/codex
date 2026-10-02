import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AnalyticsPanel } from "../../../src/features/dashboard/AnalyticsPanel";
import type { DetectionEvent } from "../../../src/types/events";

const events: DetectionEvent[] = [
  { id: "recognition-1", timestamp: Date.now() - 90_000, type: "person_recognized", label: "Demo User 01", personId: "demo-1", detectorConfidence: 0.97, recognitionSimilarity: 0.86, mode: "fusion", isDemo: true },
  { id: "object-1", timestamp: Date.now() - 40_000, type: "object_detected", label: "Bottle", detectorConfidence: 0.91, mode: "fusion", isDemo: true },
  { id: "unknown-1", timestamp: Date.now() - 5_000, type: "unknown_face", label: "Unknown person", detectorConfidence: 0.72, mode: "recognition", isDemo: true },
];

describe("dashboard analytics", () => {
  it("showsOnlyRecordedDemoEventsAndKeepsTheTwoConfidenceMeasuresSeparate", async () => {
    const loadEvents = vi.fn(async () => events);
    render(<MemoryRouter><AnalyticsPanel loadEvents={loadEvents} /></MemoryRouter>);
    expect(await screen.findByText(/fictional samples, not live detections/i)).toBeInTheDocument();
    expect(screen.getByText("Demo User 01")).toBeInTheDocument();
    expect(screen.getAllByText("Bottle")).toHaveLength(2);
    expect(screen.getByText("Average detector confidence")).toBeInTheDocument();
    expect(screen.getByText("Average recognition similarity")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Average detector confidence" })).toHaveAttribute("aria-valuenow", "87");
    expect(screen.getByRole("meter", { name: "Average recognition similarity" })).toHaveAttribute("aria-valuenow", "86");
    expect(loadEvents).toHaveBeenCalledOnce();
  });
});
