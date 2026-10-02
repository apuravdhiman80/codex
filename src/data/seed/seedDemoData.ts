import { appDatabase, ensureDatabaseReady, toDataLayerError } from "../db";
import { validateDetectionEvent } from "../migrations";
import { createDemoEvents, DEMO_PEOPLE } from "./demoData";

export async function seedDemoData(): Promise<void> {
  await ensureDatabaseReady();
  try {
    await appDatabase.transaction("rw", appDatabase.people, appDatabase.events, async () => {
      const existingPeople = await appDatabase.people.filter((person) => person.isDemo).count();
      if (existingPeople === 0) await appDatabase.people.bulkPut([...DEMO_PEOPLE]);
      const existingEvents = await appDatabase.events.filter((event) => event.isDemo).count();
      if (existingEvents === 0) {
        const events = createDemoEvents().map(validateDetectionEvent);
        await appDatabase.events.bulkAdd(events);
      }
    });
  } catch (cause) {
    throw toDataLayerError(cause);
  }
}
