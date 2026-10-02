import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../../../src/components/ConfirmDialog";
import { LoadingState } from "../../../src/components/LoadingState";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Open delete prompt</button><ConfirmDialog open={open} title="Delete records" description="Remove local records?" confirmLabel="Delete" intent="danger" onCancel={() => setOpen(false)} onConfirm={() => setOpen(false)} /></>;
}

describe("accessible confirmation and motion preferences", () => {
  it("dialogsManageFocusAndEscape", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: /open delete prompt/i });
    await user.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "Delete records" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("reducedMotionDisablesDecorativeMotion", () => {
    const prior = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes("prefers-reduced-motion"), media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false })) as typeof window.matchMedia;
    render(<LoadingState title="Loading models" description="Preparing local models" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status").querySelector(".is-spinning")).toBeNull();
    window.matchMedia = prior;
  });
});
