import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { LandingPage } from "../../../src/pages/LandingPage";

describe("landing actions and keyboard navigation", () => {
  it("keyboardNavigatesEveryPrimaryAction", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const primary = [
      screen.getByRole("link", { name: /start vision/i }),
      screen.getByRole("link", { name: /enroll person/i }),
      screen.getByRole("link", { name: /scan qr/i }),
      screen.getByRole("link", { name: /object detection/i }),
    ];
    for (const control of primary) {
      let found = document.activeElement === control;
      for (let attempt = 0; attempt < 20 && !found; attempt += 1) {
        await user.tab();
        found = document.activeElement === control;
      }
      expect(found, "the primary action should be reachable by keyboard").toBe(true);
      expect(control).toHaveAttribute("href");
    }
    expect(screen.getByRole("heading", { level: 1, name: "VisionID AI" })).toBeInTheDocument();
  });
});
