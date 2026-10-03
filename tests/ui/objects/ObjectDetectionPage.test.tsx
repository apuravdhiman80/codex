import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ObjectDetectionPage } from "../../../src/features/objects/ObjectDetectionPage";

describe("object detection page", () => {
  it("starts in object-only mode without person detection controls", () => {
    render(<ObjectDetectionPage />);
    expect(screen.getByRole("heading", { name: /object detection console/i })).toBeInTheDocument();
    expect(screen.getByText(/object-only mode/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /vision fusion|recognition only/i })).not.toBeInTheDocument();
  });
});
