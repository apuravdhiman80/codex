import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appDatabase } from "../../../src/data/db";
import { createProfile, listProfiles } from "../../../src/data/repositories/peopleRepository";
import { parsePersonQr } from "../../../src/features/qr/qrSchema";

describe("QR profile registration", () => {
  beforeEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
    await appDatabase.open();
  });
  afterEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
  });

  it("validatesQrThenCreatesLocalProfileAndDetectsDuplicate", async () => {
    const payload = JSON.stringify({ version: 1, person_id: "P-QR-1", name: "Leela Rao", role: "Member" });
    const parsed = parsePersonQr(payload, (await listProfiles()).map((profile) => profile.personId));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const profile = await createProfile({ ...parsed.value, consentRecordedAt: Date.now(), isDemo: false });

    expect(profile.personId).toBe("P-QR-1");
    expect(profile.name).toBe("Leela Rao");
    expect(await listProfiles()).toHaveLength(1);
    expect(parsePersonQr(payload, (await listProfiles()).map((entry) => entry.personId))).toMatchObject({
      ok: false,
      error: { code: "duplicate_id" },
    });
  });
});
