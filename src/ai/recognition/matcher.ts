import { VISION_CONFIG } from "../../config/vision";
import type { FaceTemplate } from "../../types/person";
import type { FaceResult } from "../../types/vision";

export interface EnrolledProfile {
  /** Internal profile key shared by the profile and its FaceTemplate rows. */
  personId: string;
  templates: FaceTemplate[];
}

export type SimilarityFunction = (query: number[], enrolled: number[]) => number;

export interface RecognitionConfig {
  threshold: number;
  unknownMatchMargin: number;
  modelId: string;
  similarity: SimilarityFunction;
}

export type RecognitionDecision =
  | { status: "recognized"; personId: string; similarity: number }
  | { status: "unknown"; reason: "below_threshold"; bestSimilarity: number }
  | { status: "unknown"; reason: "no_profiles" | "no_compatible_templates" | "invalid_descriptor" | "invalid_config"; bestSimilarity?: undefined }
  | { status: "ambiguous"; bestSimilarity: number; runnerUpSimilarity: number };

/** Human.match.similarity already returns a normalized 0..1 similarity, not a probability. */
export function normalizeHumanSimilarity(value: number): number | undefined {
  if (!Number.isFinite(value) || value < 0 || value > 1) return undefined;
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function isValidFaceDescriptor(value: unknown): value is Float32Array {
  return value instanceof Float32Array &&
    value.length === VISION_CONFIG.faceDescriptorLength &&
    value.every(Number.isFinite) &&
    value.some((component) => component !== 0);
}

export function matchFace(
  descriptor: Float32Array,
  profiles: EnrolledProfile[],
  config: RecognitionConfig,
): RecognitionDecision {
  if (!isValidFaceDescriptor(descriptor)) return { status: "unknown", reason: "invalid_descriptor" };
  if (
    !Number.isFinite(config.threshold) || config.threshold < 0 || config.threshold > 1 ||
    !Number.isFinite(config.unknownMatchMargin) || config.unknownMatchMargin < 0 || config.unknownMatchMargin > 1 ||
    !config.modelId || typeof config.similarity !== "function"
  ) return { status: "unknown", reason: "invalid_config" };
  if (!profiles.length) return { status: "unknown", reason: "no_profiles" };

  const bestScores = new Map<string, number>();
  const query = Array.from(descriptor);
  for (const profile of profiles) {
    for (const template of profile.templates) {
      if (
        template.personId !== profile.personId ||
        template.modelId !== config.modelId ||
        !isValidFaceDescriptor(template.descriptor)
      ) continue;
      try {
        const score = normalizeHumanSimilarity(config.similarity(query, Array.from(template.descriptor)));
        if (score === undefined) continue;
        bestScores.set(profile.personId, Math.max(bestScores.get(profile.personId) ?? 0, score));
      } catch {
        // A corrupt comparison never becomes a positive identity decision.
      }
    }
  }
  const ranked = [...bestScores.entries()].sort((first, second) => second[1] - first[1]);
  if (!ranked.length) return { status: "unknown", reason: "no_compatible_templates" };
  const [personId, bestSimilarity] = ranked[0]!;
  if (bestSimilarity < config.threshold) return { status: "unknown", reason: "below_threshold", bestSimilarity };
  const runnerUpSimilarity = ranked[1]?.[1];
  if (runnerUpSimilarity !== undefined && (bestSimilarity === runnerUpSimilarity || bestSimilarity - runnerUpSimilarity < config.unknownMatchMargin)) {
    return { status: "ambiguous", bestSimilarity, runnerUpSimilarity };
  }
  return { status: "recognized", personId, similarity: bestSimilarity };
}

export function recognizeFaces(
  faces: FaceResult[],
  profiles: EnrolledProfile[],
  config: RecognitionConfig,
): RecognitionDecision[] {
  return faces.map((face) => face.descriptor
    ? matchFace(face.descriptor, profiles, config)
    : { status: "unknown", reason: "invalid_descriptor" });
}
