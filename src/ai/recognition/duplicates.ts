import { VISION_CONFIG } from "../../config/vision";
import { isValidFaceDescriptor, normalizeHumanSimilarity, type EnrolledProfile, type SimilarityFunction } from "./matcher";

export interface DuplicateCandidate {
  personId: string;
  similarity: number;
}

export interface DuplicateSearchConfig {
  modelId: string;
  similarity: SimilarityFunction;
  minimumSimilarity?: number;
  maximumCandidates?: number;
}

/** Returns review candidates only; it never changes profiles or enrollment templates. */
export function findDuplicateCandidates(
  descriptor: Float32Array,
  profiles: EnrolledProfile[],
  config: DuplicateSearchConfig,
): DuplicateCandidate[] {
  if (!isValidFaceDescriptor(descriptor) || !config.modelId || typeof config.similarity !== "function") return [];
  const minimum = config.minimumSimilarity ?? VISION_CONFIG.duplicateCandidateThreshold;
  const limit = config.maximumCandidates ?? 5;
  if (!Number.isFinite(minimum) || minimum < 0 || minimum > 1 || !Number.isInteger(limit) || limit < 1 || limit > 20) return [];
  const query = Array.from(descriptor);
  const candidates: DuplicateCandidate[] = [];
  for (const profile of profiles) {
    let best = -1;
    for (const template of profile.templates) {
      if (template.personId !== profile.personId || template.modelId !== config.modelId || !isValidFaceDescriptor(template.descriptor)) continue;
      try {
        const score = normalizeHumanSimilarity(config.similarity(query, Array.from(template.descriptor)));
        if (score !== undefined) best = Math.max(best, score);
      } catch {
        // Corrupt templates are ignored and remain available for explicit owner review.
      }
    }
    if (best >= minimum) candidates.push({ personId: profile.personId, similarity: best });
  }
  return candidates.sort((first, second) => second.similarity - first.similarity).slice(0, limit);
}
