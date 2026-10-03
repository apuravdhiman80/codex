import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { APP_DATABASE_NAME, VisionDatabase } from "../../../src/data/db";
import { validateFaceTemplate } from "../../../src/data/migrations";

describe("persisted biometric schema", () => {
  it("rejectsMalformedDescriptors", () => {
    expect(() =>
      validateFaceTemplate({
        id: "template-1",
        personId: "person-1",
        descriptor: new Float32Array(1024).fill(0.1).map((value, index) =>
          index === 4 ? Number.NaN : value,
        ),
        quality: 0.9,
        pose: "front",
        createdAt: 1,
        modelId: "human-face-v1",
        isDemo: false,
      }),
    ).toThrow(/descriptor/i);

    expect(() =>
      validateFaceTemplate({
        id: "template-2",
        personId: "person-1",
        descriptor: new Float32Array([0.1, 0.2]),
        quality: 0.9,
        pose: "front",
        createdAt: 1,
        modelId: "human-face-v1",
        isDemo: false,
      }),
    ).toThrow(/descriptor/i);
  });

  it("migratesVersionOneSettingsDuringDatabaseUpgrade", async () => {
    const name = `${APP_DATABASE_NAME}-migration-test`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({ settings: "id", people: "id,&personId,name,role,department,createdAt,lastDetectedAt,isDemo" });
    await legacy.open();
    await legacy.table("settings").put({
      id: "current",
      settings: { recognitionThreshold: 0.71, detectionThreshold: 0.61 },
    });
    await legacy.table("people").put({ id: "legacy-person", personId: "cafe\u0301-01" });
    legacy.close();

    const current = new VisionDatabase(name);
    await current.open();
    const settings = await current.settings.get("current");
    const person = await current.people.get("legacy-person");

    expect(settings?.recognitionThreshold).toBe(0.71);
    expect(settings?.objectThreshold).toBe(0.61);
    expect(person?.personIdCanonical).toBe("CAFÉ-01");

    current.close();
    await current.delete();
  });
});
