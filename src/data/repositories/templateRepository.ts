import { appDatabase, createLocalId, DataLayerError, ensureDatabaseReady, toDataLayerError } from "../db";
import { validateFaceTemplate } from "../migrations";
import type { FaceTemplate, NewFaceTemplate } from "../../types/person";

export async function saveTemplates(
  personId: string,
  templates: NewFaceTemplate[],
): Promise<FaceTemplate[]> {
  if (!Array.isArray(templates) || templates.length < 1 || templates.length > 5) {
    throw new DataLayerError("invalid", "Enrollment must contain between one and five samples.");
  }
  await ensureDatabaseReady();
  try {
    const profile = await appDatabase.people.get(personId);
    if (!profile) throw new DataLayerError("not_found", "Person profile was not found.");
    if (profile.isDemo) throw new DataLayerError("invalid", "Demo profiles cannot be face-enrolled.");
    const rows = templates.map((template) => validateFaceTemplate({
      ...template,
      id: createLocalId(),
      personId,
      createdAt: Date.now(),
      isDemo: false,
    }));
    await appDatabase.templates.bulkAdd(rows);
    return rows;
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function replaceTemplatesForPerson(
  personId: string,
  templates: NewFaceTemplate[],
): Promise<FaceTemplate[]> {
  if (!Array.isArray(templates) || templates.length < 1 || templates.length > 5) {
    throw new DataLayerError("invalid", "Enrollment must contain between one and five samples.");
  }
  await ensureDatabaseReady();
  try {
    return await appDatabase.transaction("rw", appDatabase.people, appDatabase.templates, async () => {
      const profile = await appDatabase.people.get(personId);
      if (!profile) throw new DataLayerError("not_found", "Person profile was not found.");
      if (profile.isDemo) throw new DataLayerError("invalid", "Demo profiles cannot be face-enrolled.");
      const rows = templates.map((template) => validateFaceTemplate({
        ...template,
        id: createLocalId(),
        personId,
        createdAt: Date.now(),
        isDemo: false,
      }));
      await appDatabase.templates.where("personId").equals(personId).delete();
      await appDatabase.templates.bulkAdd(rows);
      return rows;
    });
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function listTemplatesForPerson(personId: string): Promise<FaceTemplate[]> {
  await ensureDatabaseReady();
  try {
    return await appDatabase.templates.where("personId").equals(personId).toArray();
  } catch (error) {
    throw toDataLayerError(error);
  }
}
