import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorState } from "../../../src/components/ErrorState";

describe("recoverable errors", () => {
  it("failuresOfferRecoveryAction", () => {
    const retry = vi.fn();
    render(<ErrorState title="Models could not load" message="Check your connection and retry." onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/check your connection/i);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
