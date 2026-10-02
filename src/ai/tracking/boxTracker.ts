import type { BoundingBox } from "../../types/vision";
import { VISION_CONFIG } from "../../config/vision";

export type TrackType = "person" | "object" | "face";

export interface Detection {
  type: TrackType;
  label: string;
  box: BoundingBox;
  detectorConfidence: number;
}

export interface Track extends Detection {
  id: string;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface TrackingConfig {
  expiryMs?: number;
  minimumIoU?: number;
  maximumCentroidDistance?: number;
  idFactory?: () => string;
}

const DEFAULT_EXPIRY_MS = VISION_CONFIG.trackExpiryMs;
const DEFAULT_MINIMUM_IOU = VISION_CONFIG.trackMinimumIoU;
const DEFAULT_MAXIMUM_CENTROID_DISTANCE = VISION_CONFIG.trackMaximumCentroidDistance;
let nextTrackId = 1;

function validDetection(detection: Detection): boolean {
  const { x, y, width, height } = detection.box;
  return Boolean(detection.label.trim()) &&
    [x, y, width, height, detection.detectorConfidence].every(Number.isFinite) &&
    x >= 0 && y >= 0 && width > 0 && height > 0 && width <= 1 && height <= 1 &&
    detection.detectorConfidence >= 0 && detection.detectorConfidence <= 1;
}

export function intersectionOverUnion(first: BoundingBox, second: BoundingBox): number {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = first.width * first.height + second.width * second.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function centroidDistance(first: BoundingBox, second: BoundingBox): number {
  const firstX = first.x + first.width / 2;
  const firstY = first.y + first.height / 2;
  const secondX = second.x + second.width / 2;
  const secondY = second.y + second.height / 2;
  return Math.hypot(firstX - secondX, firstY - secondY);
}

interface CandidatePair {
  trackIndex: number;
  detectionIndex: number;
  score: number;
}

export function updateTracks(
  previous: Track[],
  detections: Detection[],
  now: number,
  config: TrackingConfig = {},
): Track[] {
  const expiryMs = config.expiryMs ?? DEFAULT_EXPIRY_MS;
  const minimumIoU = config.minimumIoU ?? DEFAULT_MINIMUM_IOU;
  const maximumDistance = config.maximumCentroidDistance ?? DEFAULT_MAXIMUM_CENTROID_DISTANCE;
  const makeId = config.idFactory ?? (() => `track-${nextTrackId++}`);
  const active = previous.filter((track) => now - track.lastSeenAt <= expiryMs);
  const valid = detections.map((detection, index) => ({ detection, index })).filter(({ detection }) => validDetection(detection));
  const pairs: CandidatePair[] = [];
  for (let trackIndex = 0; trackIndex < active.length; trackIndex += 1) {
    const track = active[trackIndex]!;
    for (const { detection, index: detectionIndex } of valid) {
      if (track.type !== detection.type || track.label !== detection.label) continue;
      const iou = intersectionOverUnion(track.box, detection.box);
      const distance = centroidDistance(track.box, detection.box);
      if (iou >= minimumIoU || distance <= maximumDistance) pairs.push({ trackIndex, detectionIndex, score: iou + Math.max(0, 1 - distance) * 0.1 });
    }
  }
  pairs.sort((first, second) => second.score - first.score);
  const usedTracks = new Set<number>();
  const usedDetections = new Set<number>();
  const nextByTrack = new Map<number, Track>();
  for (const pair of pairs) {
    if (usedTracks.has(pair.trackIndex) || usedDetections.has(pair.detectionIndex)) continue;
    const track = active[pair.trackIndex]!;
    const detection = detections[pair.detectionIndex]!;
    usedTracks.add(pair.trackIndex);
    usedDetections.add(pair.detectionIndex);
    nextByTrack.set(pair.trackIndex, {
      ...track,
      box: { ...detection.box },
      detectorConfidence: detection.detectorConfidence,
      lastSeenAt: now,
    });
  }

  const result = active.flatMap((track, index) => {
    const updated = nextByTrack.get(index);
    return updated ? [updated] : usedTracks.has(index) ? [] : [track];
  });
  for (const { detection, index } of valid) {
    if (usedDetections.has(index)) continue;
    result.push({
      ...detection,
      box: { ...detection.box },
      id: makeId(),
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }
  return result;
}
