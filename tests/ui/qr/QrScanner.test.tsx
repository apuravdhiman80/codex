import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QrScanner } from "../../../src/features/qr/QrScanner";

const mocks = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("../../../src/features/qr/qrService", () => ({ startQrScanner: mocks.start }));

describe("QR scanner", () => {
  beforeEach(() => mocks.start.mockReset());
  afterEach(() => vi.clearAllMocks());

  it("showsRecoverableCameraErrorAndManualEntry", async () => {
    const onError = vi.fn();
    render(<QrScanner onValidPayload={vi.fn()} onError={onError} />);
    mocks.start.mockRejectedValueOnce(new Error("Camera permission denied"));

    fireEvent.click(screen.getByRole("button", { name: /start qr scanner/i }));

    expect(await screen.findByText(/camera permission denied/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/paste person qr json/i)).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it("validatesManualPayloadBeforeCallingParentAndStopsCamera", async () => {
    const onValidPayload = vi.fn();
    const stop = vi.fn();
    mocks.start.mockResolvedValueOnce(stop);
    const { unmount } = render(<QrScanner onValidPayload={onValidPayload} onError={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start qr scanner/i }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/paste person qr json/i), {
      target: { value: JSON.stringify({ version: 1, person_id: "P002", name: "Kiran" }) },
    });
    fireEvent.click(screen.getByRole("button", { name: /validate qr data/i }));

    expect(onValidPayload).toHaveBeenCalledWith({ version: 1, personId: "P002", name: "Kiran" });
    expect(await screen.findByText(/review the profile preview/i)).toBeInTheDocument();
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });
});
