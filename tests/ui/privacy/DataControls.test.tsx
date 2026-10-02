import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DataControls } from "../../../src/features/settings/DataControls";

const lifecycle = vi.hoisted(() => ({ resetDemoData: vi.fn(async () => undefined), clearAllLocalData: vi.fn(async () => undefined) }));
const modelCache = vi.hoisted(() => ({ clearModelCache: vi.fn(async () => undefined) }));
vi.mock("../../../src/features/settings/dataLifecycle", () => lifecycle);
vi.mock("../../../src/ai/engine/modelCache", () => modelCache);

describe("local data controls", () => {
  afterEach(() => { vi.restoreAllMocks(); lifecycle.resetDemoData.mockClear(); lifecycle.clearAllLocalData.mockClear(); modelCache.clearModelCache.mockClear(); });

  it("requires confirmation and resets demo records", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DataControls />);
    fireEvent.click(screen.getByRole("button", { name: /reset demo/i }));
    expect(lifecycle.resetDemoData).toHaveBeenCalledOnce();
    expect(await screen.findByText(/demo records were reset/i)).toBeInTheDocument();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Your own profiles"));
  });

  it("doesNotDeleteAnythingWhenConfirmationIsCancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DataControls />);
    fireEvent.click(screen.getByRole("button", { name: /delete all data/i }));
    expect(lifecycle.clearAllLocalData).not.toHaveBeenCalled();
    expect(modelCache.clearModelCache).not.toHaveBeenCalled();
  });
});
