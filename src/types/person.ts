export type PersonMetadata = Record<string, string>;

/** A profile is stored locally. `id` is the internal key; `personId` is user supplied. */
export interface PersonProfile {
  id: string;
  personId: string;
  /** Indexed canonical lookup key; optional only for in-memory legacy fixtures. */
  personIdCanonical?: string;
  name: string;
  role: string;
  department: string;
  email?: string;
  phone?: string;
  organization?: string;
  metadata: PersonMetadata;
  photoBlob?: Blob;
  createdAt: number;
  updatedAt: number;
  lastDetectedAt?: number;
  consentRecordedAt: number;
  isDemo: boolean;
}

export interface CreatePersonInput {
  personId: string;
  name: string;
  role?: string;
  department?: string;
  email?: string;
  phone?: string;
  organization?: string;
  metadata?: PersonMetadata;
  photoBlob?: Blob;
  consentRecordedAt: number;
  isDemo?: boolean;
}

export type PersonProfilePatch = Partial<
  Pick<
    PersonProfile,
    | "personId"
    | "name"
    | "role"
    | "department"
    | "email"
    | "phone"
    | "organization"
    | "metadata"
    | "photoBlob"
    | "consentRecordedAt"
    | "lastDetectedAt"
  >
>;

/** Descriptors are browser biometric data and must never be exported by default. */
export interface FaceTemplate {
  id: string;
  /** Internal PersonProfile.id, not the visible personId. */
  personId: string;
  descriptor: Float32Array;
  quality: number;
  pose: string;
  createdAt: number;
  modelId: string;
  isDemo: boolean;
}

export interface NewFaceTemplate {
  descriptor: Float32Array;
  quality: number;
  pose: string;
  modelId: string;
}
