import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { EnrollmentPage } from "../../../src/features/enrollment/EnrollmentPage";
import type { EnrollmentServices } from "../../../src/features/enrollment/enrollmentServices";

describe("enrollment page", () => {
  it("keepsProfilesOnDeviceAndShowsPrivacyBeforeConsent", async () => {
    const services: Partial<EnrollmentServices> = {
      listProfiles: vi.fn(async () => []),
      createProfile: vi.fn(),
    };
    render(<MemoryRouter><EnrollmentPage services={services} /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Enroll a Person" })).toBeInTheDocument();
    expect(screen.getByText(/camera frames are discarded after local processing.*face descriptors stay on this device/i)).toBeInTheDocument();
    expect(services.createProfile).not.toHaveBeenCalled();
  });

  it("manualEntryIsValidatedBeforeProfilePreview", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><EnrollmentPage services={{ listProfiles: async () => [] }} /></MemoryRouter>);
    await user.type(screen.getByLabelText("Person ID"), "MANUAL-1");
    await user.type(screen.getByLabelText("Name"), "Example Member");
    await user.click(screen.getByRole("button", { name: /preview profile/i }));

    await waitFor(() => expect(screen.getByText(/review profile/i)).toBeInTheDocument());
    expect(screen.getByText("Example Member")).toBeInTheDocument();
  });
});
