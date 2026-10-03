import { VISION_CONFIG } from "../../config/vision";
import type { PersonMetadata } from "../../types/person";
import { normalizePersonId } from "../../utils/personId";

export interface ValidatedPersonPayload {
  version: 1;
  personId: string;
  name: string;
  role?: string;
  department?: string;
  email?: string;
  phone?: string;
  organization?: string;
  metadata?: PersonMetadata;
}

export type QrValidationCode =
  | "too_large"
  | "invalid_json"
  | "invalid_shape"
  | "unsupported_version"
  | "invalid_field"
  | "duplicate_id";

export class QrValidationError extends Error {
  readonly code: QrValidationCode;
  readonly field?: string;

  constructor(code: QrValidationCode, message: string, field?: string) {
    super(message);
    this.name = "QrValidationError";
    this.code = code;
    this.field = field;
  }
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const allowedFields = new Set([
  "version",
  "person_id",
  "name",
  "role",
  "department",
  "email",
  "phone",
  "organization",
  "metadata",
]);
const limits = {
  personId: 64,
  name: 120,
  role: 120,
  department: 120,
  email: 254,
  phone: 40,
  organization: 160,
  metadataKey: 64,
  metadataValue: 256,
  metadataBytes: 2048,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function plainText(value: unknown, field: string, maxLength: number, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string") {
    throw new QrValidationError("invalid_field", `${field} must be plain text.`, field);
  }
  const normalized = value.trim();
  const hasControl = [...normalized].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  });
  if (
    (required && !normalized) ||
    normalized.length > maxLength ||
    hasControl ||
    normalized.includes("<") ||
    normalized.includes(">")
  ) {
    throw new QrValidationError("invalid_field", `${field} is empty or contains unsupported text.`, field);
  }
  return normalized;
}

function normalizeMetadata(value: unknown): PersonMetadata | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new QrValidationError("invalid_field", "Metadata must be a text object.", "metadata");
  }
  const result: PersonMetadata = {};
  let byteCount = 0;
  const entries = Object.entries(value);
  if (entries.length > 32) {
    throw new QrValidationError("invalid_field", "Metadata can contain at most 32 entries.", "metadata");
  }
  for (const [key, rawValue] of entries) {
    const cleanKey = plainText(key, "metadata key", limits.metadataKey, true)!;
    if (["__proto__", "constructor", "prototype"].includes(cleanKey)) {
      throw new QrValidationError("invalid_field", "Metadata contains a reserved key.", "metadata");
    }
    const cleanValue = plainText(rawValue, `metadata.${cleanKey}`, limits.metadataValue, true)!;
    byteCount += new TextEncoder().encode(`${cleanKey}${cleanValue}`).byteLength;
    result[cleanKey] = cleanValue;
  }
  if (byteCount > limits.metadataBytes) {
    throw new QrValidationError("invalid_field", "Metadata must fit within 2 KiB.", "metadata");
  }
  return result;
}

function parse(payload: string, existingIds: string[]): ValidatedPersonPayload {
  if (typeof payload !== "string") {
    throw new QrValidationError("invalid_json", "QR content must be text.");
  }
  const encodedBytes = new TextEncoder().encode(payload).byteLength;
  if (encodedBytes > VISION_CONFIG.qrPayloadMaxBytes) {
    throw new QrValidationError("too_large", "QR data is larger than the 8 KiB limit.");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(payload) as unknown;
  } catch {
    throw new QrValidationError("invalid_json", "QR data is not valid JSON.");
  }
  if (!isRecord(decoded)) {
    throw new QrValidationError("invalid_shape", "QR data must be a JSON object.");
  }
  const unknownKeys = Object.keys(decoded).filter((key) => !allowedFields.has(key));
  if (unknownKeys.length > 0) {
    throw new QrValidationError("invalid_shape", "QR data contains unsupported fields.");
  }
  if (decoded.version !== 1) {
    throw new QrValidationError("unsupported_version", "This QR format version is not supported.", "version");
  }

  const personId = plainText(decoded.person_id, "person_id", limits.personId, true)!;
  const name = plainText(decoded.name, "name", limits.name, true)!;
  if (existingIds.some((id) => normalizePersonId(id) === normalizePersonId(personId))) {
    throw new QrValidationError("duplicate_id", "A person with this ID is already registered.", "person_id");
  }

  const role = plainText(decoded.role, "role", limits.role);
  const department = plainText(decoded.department, "department", limits.department);
  const email = plainText(decoded.email, "email", limits.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new QrValidationError("invalid_field", "Email address is not valid.", "email");
  }
  const phone = plainText(decoded.phone, "phone", limits.phone);
  const organization = plainText(decoded.organization, "organization", limits.organization);
  const metadata = normalizeMetadata(decoded.metadata);

  return {
    version: 1,
    personId,
    name,
    ...(role ? { role } : {}),
    ...(department ? { department } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(organization ? { organization } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function parsePersonQr(
  payload: string,
  existingIds: string[] = [],
): Result<ValidatedPersonPayload, QrValidationError> {
  try {
    return { ok: true, value: parse(payload, existingIds) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof QrValidationError
        ? error
        : new QrValidationError("invalid_shape", "QR data could not be validated."),
    };
  }
}

export function createPersonQr(payload: ValidatedPersonPayload): string {
  const raw = {
    version: 1,
    person_id: payload.personId,
    name: payload.name,
    ...(payload.role ? { role: payload.role } : {}),
    ...(payload.department ? { department: payload.department } : {}),
    ...(payload.email ? { email: payload.email } : {}),
    ...(payload.phone ? { phone: payload.phone } : {}),
    ...(payload.organization ? { organization: payload.organization } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };
  const encoded = JSON.stringify(raw);
  const result = parsePersonQr(encoded);
  if (!result.ok) throw result.error;
  return encoded;
}
