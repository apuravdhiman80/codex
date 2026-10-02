import { appDatabase, createLocalId, DataLayerError, ensureDatabaseReady, toDataLayerError } from "../db";
import type { CreatePersonInput, PersonProfile, PersonProfilePatch } from "../../types/person";

const FIELD_LIMITS = {
  personId: 64,
  name: 120,
  role: 120,
  department: 120,
  email: 254,
  phone: 40,
  organization: 160,
  metadataKey: 64,
  metadataValue: 256,
  metadataTotal: 2048,
  photoBytes: 5 * 1024 * 1024,
} as const;

function text(value: unknown, field: string, max: number, required = false): string {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") {
    throw new DataLayerError("invalid", `${field} must be text.`);
  }
  const normalized = value.trim();
  const hasControlCharacter = [...normalized].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  });
  if ((required && !normalized) || normalized.length > max || hasControlCharacter) {
    throw new DataLayerError("invalid", `${field} is missing or exceeds its allowed format.`);
  }
  return normalized;
}

function normalizeMetadata(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DataLayerError("invalid", "Metadata must be a simple text object.");
  }
  const normalized: Record<string, string> = {};
  let totalBytes = 0;
  for (const [key, entry] of Object.entries(value)) {
    const cleanKey = text(key, "Metadata key", FIELD_LIMITS.metadataKey, true);
    const cleanValue = text(entry, `Metadata value for ${cleanKey}`, FIELD_LIMITS.metadataValue);
    if (cleanKey === "__proto__" || cleanKey === "constructor" || cleanKey === "prototype") {
      throw new DataLayerError("invalid", "Metadata key is reserved.");
    }
    totalBytes += new TextEncoder().encode(cleanKey + cleanValue).byteLength;
    normalized[cleanKey] = cleanValue;
  }
  if (totalBytes > FIELD_LIMITS.metadataTotal) {
    throw new DataLayerError("invalid", "Metadata must be at most 2 KiB.");
  }
  return normalized;
}

function normalizeProfileFields(input: CreatePersonInput): Omit<PersonProfile, "id" | "createdAt" | "updatedAt"> {
  const personId = text(input.personId, "Person ID", FIELD_LIMITS.personId, true);
  const name = text(input.name, "Name", FIELD_LIMITS.name, true);
  const email = text(input.email, "Email", FIELD_LIMITS.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new DataLayerError("invalid", "Email address is not valid.");
  }
  const consentRecordedAt = input.consentRecordedAt;
  if (!Number.isFinite(consentRecordedAt) || consentRecordedAt <= 0 || consentRecordedAt > Date.now()) {
    throw new DataLayerError("invalid", "Consent timestamp is invalid.");
  }
  if (input.photoBlob !== undefined && (!(input.photoBlob instanceof Blob) || input.photoBlob.size > FIELD_LIMITS.photoBytes)) {
    throw new DataLayerError("invalid", "Profile photo must be an image smaller than 5 MiB.");
  }
  const metadata = normalizeMetadata(input.metadata);
  return {
    personId,
    name,
    role: text(input.role, "Role", FIELD_LIMITS.role),
    department: text(input.department, "Department", FIELD_LIMITS.department),
    email,
    phone: text(input.phone, "Phone", FIELD_LIMITS.phone),
    organization: text(input.organization, "Organization", FIELD_LIMITS.organization),
    metadata,
    ...(input.photoBlob ? { photoBlob: input.photoBlob } : {}),
    consentRecordedAt,
    isDemo: input.isDemo === true,
  };
}

function validatePatch(input: PersonProfilePatch): void {
  if (input.personId !== undefined) text(input.personId, "Person ID", FIELD_LIMITS.personId, true);
  if (input.name !== undefined) text(input.name, "Name", FIELD_LIMITS.name, true);
  if (input.role !== undefined) text(input.role, "Role", FIELD_LIMITS.role);
  if (input.department !== undefined) text(input.department, "Department", FIELD_LIMITS.department);
  if (input.email !== undefined) {
    const email = text(input.email, "Email", FIELD_LIMITS.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      throw new DataLayerError("invalid", "Email address is not valid.");
    }
  }
  if (input.phone !== undefined) text(input.phone, "Phone", FIELD_LIMITS.phone);
  if (input.organization !== undefined) text(input.organization, "Organization", FIELD_LIMITS.organization);
  if (input.metadata !== undefined) normalizeMetadata(input.metadata);
  if (input.photoBlob !== undefined && (!(input.photoBlob instanceof Blob) || input.photoBlob.size > FIELD_LIMITS.photoBytes)) {
    throw new DataLayerError("invalid", "Profile photo must be an image smaller than 5 MiB.");
  }
  if (input.consentRecordedAt !== undefined && (!Number.isFinite(input.consentRecordedAt) || input.consentRecordedAt <= 0)) {
    throw new DataLayerError("invalid", "Consent timestamp is invalid.");
  }
  if (input.lastDetectedAt !== undefined && (!Number.isFinite(input.lastDetectedAt) || input.lastDetectedAt <= 0)) {
    throw new DataLayerError("invalid", "Detection timestamp is invalid.");
  }
}

export async function createProfile(input: CreatePersonInput): Promise<PersonProfile> {
  const fields = normalizeProfileFields(input);
  const now = Date.now();
  const profile: PersonProfile = {
    id: createLocalId(),
    ...fields,
    createdAt: now,
    updatedAt: now,
  };
  await ensureDatabaseReady();
  try {
    await appDatabase.people.add(profile);
    return profile;
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function getProfile(id: string): Promise<PersonProfile | undefined> {
  await ensureDatabaseReady();
  try {
    return await appDatabase.people.get(id);
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function updateProfile(id: string, patch: PersonProfilePatch): Promise<PersonProfile> {
  validatePatch(patch);
  await ensureDatabaseReady();
  try {
    const current = await appDatabase.people.get(id);
    if (!current) throw new DataLayerError("not_found", "Person profile was not found.");
    const updated: PersonProfile = {
      ...current,
      ...patch,
      metadata: patch.metadata === undefined ? current.metadata : normalizeMetadata(patch.metadata),
      updatedAt: Date.now(),
    };
    await appDatabase.people.put(updated);
    return updated;
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function deleteProfileCascade(id: string): Promise<void> {
  await ensureDatabaseReady();
  try {
    await appDatabase.transaction(
      "rw",
      appDatabase.people,
      appDatabase.templates,
      appDatabase.events,
      async () => {
        await appDatabase.templates.where("personId").equals(id).delete();
        await appDatabase.events.where("personId").equals(id).delete();
        await appDatabase.people.delete(id);
      },
    );
  } catch (error) {
    throw toDataLayerError(error);
  }
}

export async function listProfiles(): Promise<PersonProfile[]> {
  await ensureDatabaseReady();
  try {
    return await appDatabase.people.orderBy("name").toArray();
  } catch (error) {
    throw toDataLayerError(error);
  }
}
