import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { PeopleDirectory } from "../../../src/features/people/PeopleDirectory";
import type { PersonProfile } from "../../../src/types/person";

const profiles: PersonProfile[] = [
  { id: "profile-a", personId: "P-A", name: "Asha Rao", role: "Student", department: "AI", metadata: {}, createdAt: 1, updatedAt: 1, consentRecordedAt: 1, isDemo: false },
  { id: "profile-b", personId: "P-B", name: "Biraj Das", role: "Staff", department: "Vision", metadata: {}, createdAt: 2, updatedAt: 2, consentRecordedAt: 2, isDemo: false },
];

describe("people directory", () => {
  it("searchesProfilesByNameAndIdentifier", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><PeopleDirectory listProfiles={vi.fn(async () => profiles)} /></MemoryRouter>);
    await user.type(await screen.findByRole("searchbox", { name: /search people/i }), "P-B");

    expect(await screen.findByText("Biraj Das")).toBeInTheDocument();
    expect(screen.queryByText("Asha Rao")).not.toBeInTheDocument();
  });

  it("showsAnEmptyStateWhenNoPeopleMatch", async () => {
    render(<MemoryRouter><PeopleDirectory listProfiles={async () => []} /></MemoryRouter>);

    expect(await screen.findByText(/no people enrolled yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /enroll a person/i })[0]).toHaveAttribute("href", "/enroll");
  });
});
