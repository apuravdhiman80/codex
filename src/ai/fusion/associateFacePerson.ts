import type { BoundingBox } from "../../types/vision";
import { VISION_CONFIG } from "../../config/vision";

export interface PersonBox {
  trackId: string;
  box: BoundingBox;
}

export function associateFacePerson(
  face: BoundingBox,
  personBoxes: PersonBox[],
  minimumFaceContainment = VISION_CONFIG.facePersonMinimumContainment,
  ambiguityMargin = VISION_CONFIG.facePersonAmbiguityMargin,
): string | undefined {
  if (!Number.isFinite(minimumFaceContainment) || minimumFaceContainment < 0 || minimumFaceContainment > 1 || !Number.isFinite(ambiguityMargin) || ambiguityMargin < 0 || ambiguityMargin > 1) return undefined;
  if (![face.x, face.y, face.width, face.height].every(Number.isFinite) || face.width <= 0 || face.height <= 0) return undefined;
  const faceArea = face.width * face.height;
  const candidates: Array<{ trackId: string; containment: number }> = [];
  for (const person of personBoxes) {
    const { x, y, width, height } = person.box;
    if (!person.trackId || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;
    const intersectionWidth = Math.max(0, Math.min(face.x + face.width, x + width) - Math.max(face.x, x));
    const intersectionHeight = Math.max(0, Math.min(face.y + face.height, y + height) - Math.max(face.y, y));
    const containment = intersectionWidth * intersectionHeight / faceArea;
    if (containment >= minimumFaceContainment) candidates.push({ trackId: person.trackId, containment });
  }
  candidates.sort((first, second) => second.containment - first.containment);
  const best = candidates[0];
  const runnerUp = candidates[1];
  if (best && runnerUp && (best.containment === runnerUp.containment || best.containment - runnerUp.containment < ambiguityMargin)) return undefined;
  return best?.trackId;
}
