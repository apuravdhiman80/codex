import { appDatabase, ensureDatabaseReady, toDataLayerError } from "../db";
import { validateDetectionEvent } from "../migrations";
import type { DetectionEvent, EventQuery, NewDetectionEvent } from "../../types/events";

export async function addEvents(events: NewDetectionEvent[]): Promise<DetectionEvent[]> {
  if (!Array.isArray(events) || events.length > 500) throw new Error("A write can contain at most 500 events.");
  const rows = events.map(validateDetectionEvent);
  await ensureDatabaseReady();
  try {
    await appDatabase.events.bulkAdd(rows);
    return rows;
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function queryEvents(query: EventQuery = {}): Promise<DetectionEvent[]> {
  await ensureDatabaseReady();
  try {
    let collection = appDatabase.events.orderBy("timestamp").reverse();
    if (query.from !== undefined) collection = collection.filter((event) => event.timestamp >= query.from!);
    if (query.to !== undefined) collection = collection.filter((event) => event.timestamp <= query.to!);
    if (query.type !== undefined) collection = collection.filter((event) => event.type === query.type);
    if (query.personId !== undefined) collection = collection.filter((event) => event.personId === query.personId);
    const rows = await collection.toArray();
    const limit = Math.max(1, Math.min(1000, Math.floor(query.limit ?? 250)));
    return rows.slice(0, limit);
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function deleteAllEvents(): Promise<void> {
  await ensureDatabaseReady();
  try {
    await appDatabase.events.clear();
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function pruneEventsBefore(timestamp: number): Promise<number> {
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new Error("Event retention cutoff must be a non-negative timestamp.");
  await ensureDatabaseReady();
  try {
    return await appDatabase.events.where("timestamp").below(timestamp).delete();
  } catch (error) {
    throw toDataLayerError(error);
  }
}
