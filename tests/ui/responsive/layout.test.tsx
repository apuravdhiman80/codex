import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AppShell } from "../../../src/app/AppShell";

describe("responsive navigation", () => {
  it("responsiveNavigationWorksOnNarrowLayouts", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([{ path: "/", element: <AppShell />, children: [{ index: true, element: <h1>Object detection</h1> }, { path: "objects", element: <h1>Other page</h1> }] }], { initialEntries: ["/objects"] });
    render(<RouterProvider router={router} />);
    const sidebar = document.querySelector(".sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open navigation/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open navigation/i }));
    expect(sidebar).toHaveClass("sidebar-open");
    await user.click(screen.getByRole("link", { name: /object detection/i }));
    expect(await screen.findByRole("heading", { name: "Object detection" })).toBeInTheDocument();
    expect(sidebar).not.toHaveClass("sidebar-open");
  });
});
