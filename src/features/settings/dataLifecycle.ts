import { appDatabase, ensureDatabaseReady, toDataLayerError } from "../../data/db";
import { seedDemoData } from "../../data/seed/seedDemoData";
import { stopActiveVision } from "../vision/InferenceLoop";

export async function resetDemoData(): Promise<void> {
  await ensureDatabaseReady();
  try {
    await appDatabase.transaction("rw", appDatabase.people, appDatabase.templates, appDatabase.events, async () => {
      await appDatabase.templates.filter((template) => template.isDemo).delete();
      await appDatabase.events.filter((event) => event.isDemo).delete();
      await appDatabase.people.filter((person) => person.isDemo).delete();
    });
    await seedDemoData();
  } catch (cause) {
    throw toDataLayerError(cause);
  }
}

export async function clearAllLocalData(stopVision: () => Promise<void> = stopActiveVision): Promise<void> {
  await stopVision();
  await ensureDatabaseReady();
  try {
    await appDatabase.transaction("rw", appDatabase.people, appDatabase.templates, appDatabase.events, appDatabase.settings, async () => {
      await appDatabase.people.clear();
      await appDatabase.templates.clear();
      await appDatabase.events.clear();
      await appDatabase.settings.clear();
    });
  } catch (cause) {
    throw toDataLayerError(cause);
  }
}
