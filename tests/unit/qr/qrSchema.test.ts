import { describe, expect, it } from "vitest";
import { createPersonQr, parsePersonQr, type ValidatedPersonPayload } from "../../../src/features/qr/qrSchema";

const valid: ValidatedPersonPayload = {
  version: 1,
  personId: "P001",
  name: "Asha Nair",
  role: "Student",
  department: "Design",
  email: "asha@example.test",
  phone: "+91 99999 00000",
  organization: "Example Institute",
  metadata: { batch: "2026", section: "A" },
};

describe("person QR payload", () => {
  it("parsesValidV1Payload", () => {
    const result = parsePersonQr(JSON.stringify({
      version: 1,
      person_id: "  P001  ",
      name: "  Asha Nair  ",
      role: "Student",
      metadata: { batch: "2026" },
    }));

    expect(result).toEqual({
      ok: true,
      value: { version: 1, personId: "P001", name: "Asha Nair", role: "Student", metadata: { batch: "2026" } },
    });
  });

  it("rejectsInvalidAndUnsupportedPayloads", () => {
    for (const payload of [
      "not json",
      JSON.stringify({ version: 2, person_id: "P1", name: "Asha" }),
      JSON.stringify({ version: 1, person_id: "", name: "Asha" }),
      JSON.stringify({ version: 1, person_id: "P1", name: "<script>alert(1)</script>" }),
      JSON.stringify({ version: 1, person_id: "P1", name: "Asha", photo: "data:image/png;base64,..." }),
      JSON.stringify({ version: 1, person_id: "P1", name: "Asha", descriptor: [1, 2, 3] }),
      JSON.stringify({ version: 1, person_id: "P1", name: "Asha", unknown: "not allowed" }),
      JSON.stringify({ version: 1, person_id: "P1", name: "Asha", metadata: "<b>markup</b>" }),
    ]) {
      expect(parsePersonQr(payload).ok).toBe(false);
    }
  });

  it("enforcesUtf8ByteLimit", () => {
    const base = JSON.stringify({ version: 1, person_id: "P1", name: "Asha 李" });
    const byteLength = new TextEncoder().encode(base).byteLength;
    const atLimit = base + " ".repeat(8192 - byteLength);
    const overLimit = `${atLimit} `;

    expect(new TextEncoder().encode(atLimit).byteLength).toBe(8192);
    expect(parsePersonQr(atLimit).ok).toBe(true);
    expect(parsePersonQr(overLimit)).toMatchObject({ ok: false, error: { code: "too_large" } });
  });

  it("rejectsDuplicatePersonId", () => {
    const result = parsePersonQr(
      JSON.stringify({ version: 1, person_id: "p001", name: "Asha" }),
      ["P001"],
    );
    expect(result).toMatchObject({ ok: false, error: { code: "duplicate_id" } });
  });

  it("roundTripsGeneratedQr", () => {
    const encoded = createPersonQr(valid);
    expect(parsePersonQr(encoded)).toEqual({ ok: true, value: valid });
  });
});
