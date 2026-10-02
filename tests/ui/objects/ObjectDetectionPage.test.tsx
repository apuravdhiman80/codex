import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ObjectDetectionPage } from "../../../src/features/objects/ObjectDetectionPage";

describe("object detection page", () => {
  it("offers an independent object detection mode", () => {
    render(<ObjectDetectionPage />);
    expect(screen.getByRole("heading", { name: /object detection console/i })).toBeInTheDocument();
    expect(screen.getByText(/object-only mode/i)).toBeInTheDocument();
  });
});
