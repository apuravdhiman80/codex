import { VISION_CONFIG } from "../../config/vision";
import { aggregateEvents } from "../../ai/fusion/aggregateEvents";
import { matchFace, type RecognitionDecision } from "../../ai/recognition/matcher";
import { updateTracks, type Detection, type Track } from "../../ai/tracking/boxTracker";
import { addEvents as persistEvents, queryEvents as readEvents } from "../../data/repositories/eventRepository";
import { listProfiles as readProfiles, updateProfile as writeProfile } from "../../data/repositories/peopleRepository";
import { listTemplatesForPerson as readTemplates } from "../../data/repositories/templateRepository";
import type { VisionEngine, ModelStatus } from "../../ai/engine/types";
import type { DetectionEvent, NewDetectionEvent } from "../../types/events";
import type { FaceResult, ObjectResult, VisionMode, VisionSettings } from "../../types/vision";
import type { PersonProfile, FaceTemplate } from "../../types/person";
import type { EnrolledProfile } from "../../ai/recognition/matcher";

export interface TrackedFaceResult {
  face: FaceResult;
  trackId: string;
  decision: RecognitionDecision;
  profile?: PersonProfile;
}

export interface TrackedObjectResult extends ObjectResult {
  trackId: string;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface FrameViewModel {
  faces: TrackedFaceResult[];
  objects: TrackedObjectResult[];
  eventDelta: DetectionEvent[];
  inferenceLatencyMs: number;
  totalLatencyMs: number;
  measuredFps: number;
  engineState: ModelStatus;
  warnings: string[];
  capturedAt: number;
}

export interface InferenceLoopDependencies {
  video: HTMLVideoElement;
  engine: VisionEngine;
  settings: VisionSettings;
  mode: VisionMode;
  onFrame(frame: FrameViewModel): void;
  listProfiles(): Promise<PersonProfile[]>;
  listTemplatesForPerson(personId: string): Promise<FaceTemplate[]>;
  queryEvents(query: { from?: number; limit?: number }): Promise<DetectionEvent[]>;
  addEvents(events: NewDetectionEvent[]): Promise<DetectionEvent[]>;
  updateProfile?(id: string, patch: { lastDetectedAt: number }): Promise<PersonProfile>;
  onStop?(): void;
  now?: () => number;
}

const activeLoops = new Set<InferenceLoop>();
const PROFILE_REFRESH_MS = 5000;

function boxEqualEnough(first: Detection["box"], second: Detection["box"]): number {
  const intersectionX = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const intersectionY = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  const intersection = intersectionX * intersectionY;
  const union = first.width * first.height + second.width * second.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function tracksForDetections(
  detections: Detection[],
  tracks: Track[],
  timestamp: number,
): Track[] {
  const current = tracks.filter((track) => track.lastSeenAt === timestamp);
  const used = new Set<string>();
  return detections.map((detection) => {
    const matching = current
      .filter((track) => !used.has(track.id) && track.type === detection.type && track.label === detection.label)
      .sort((first, second) => boxEqualEnough(second.box, detection.box) - boxEqualEnough(first.box, detection.box))[0];
    if (!matching) return {
      ...detection,
      id: "",
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
    };
    used.add(matching.id);
    return matching;
  });
}

export class InferenceLoop {
  private readonly dependencies: InferenceLoopDependencies;
  private running = false;
  private epoch = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private pending?: Promise<void>;
  private stopPromise?: Promise<void>;
  private released = false;
  private tracks: Track[] = [];
  private enrolledProfiles: Array<{ profile: PersonProfile; match: EnrolledProfile }> = [];
  private profilesRefreshedAt = 0;
  private profilesLoaded = false;
  private recentEvents: DetectionEvent[] = [];
  private recentEventsLoaded = false;
  private previousFrameStart?: number;
  private lastCapturedAt = 0;

  constructor(dependencies: InferenceLoopDependencies) {
    this.dependencies = dependencies;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.released = false;
    this.stopPromise = undefined;
    const epoch = ++this.epoch;
    activeLoops.add(this);
    void this.run(epoch);
  }

  async stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.running = false;
    ++this.epoch;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.released) {
      this.released = true;
      this.dependencies.onStop?.();
    }
    const pending = this.pending;
    this.stopPromise = (async () => {
      await pending?.catch(() => undefined);
      activeLoops.delete(this);
      this.pending = undefined;
    })();
    return this.stopPromise;
  }

  private isCurrent(epoch: number): boolean {
    return this.running && epoch === this.epoch;
  }

  private async run(epoch: number): Promise<void> {
    if (!this.isCurrent(epoch)) return;
    const current = this.processFrame(epoch).catch((cause: unknown) => {
      if (!this.isCurrent(epoch)) return;
      const message = cause instanceof Error ? cause.message : "The vision frame could not be processed.";
      this.dependencies.onFrame({
        faces: [], objects: [], eventDelta: [], inferenceLatencyMs: 0, totalLatencyMs: 0,
        measuredFps: 0, engineState: this.dependencies.engine.status(), warnings: [message], capturedAt: (this.dependencies.now ?? Date.now)(),
      });
    }).finally(() => {
      if (this.pending === current) this.pending = undefined;
    });
    this.pending = current;
    await current;
    if (!this.isCurrent(epoch)) return;
    this.timer = setTimeout(() => void this.run(epoch), this.dependencies.settings.inferenceIntervalMs);
  }

  private async processFrame(epoch: number): Promise<void> {
    const { video, engine, settings, mode } = this.dependencies;
    const started = performance.now();
    const capturedAt = Math.max((this.dependencies.now ?? Date.now)(), this.lastCapturedAt + 1);
    this.lastCapturedAt = capturedAt;
    const measuredFps = this.previousFrameStart === undefined ? 0 : 1000 / Math.max(1, started - this.previousFrameStart);
    this.previousFrameStart = started;
    const result = await engine.detect(video);
    if (!this.isCurrent(epoch)) return;

    const warnings = [...result.warnings];
    const profiles = mode === "objects" ? [] : await this.loadProfiles(capturedAt, warnings);
    if (!this.isCurrent(epoch)) return;

    const faces = mode === "objects"
      ? []
      : result.faces.filter((face) => face.detectorConfidence >= VISION_CONFIG.faceDetectionThreshold);
    const objects = mode === "recognition"
      ? []
      : result.objects.filter((object) => object.detectorConfidence >= settings.objectThreshold);
    const detections: Detection[] = [
      ...faces.map((face) => ({ type: "face" as const, label: "Face", box: face.box, detectorConfidence: face.detectorConfidence })),
      ...objects.map((object) => ({ type: "object" as const, label: object.className, box: object.box, detectorConfidence: object.detectorConfidence })),
    ];
    this.tracks = updateTracks(this.tracks, detections, capturedAt, { expiryMs: settings.trackExpiryMs });
    const faceTracks = tracksForDetections(detections.filter((item) => item.type === "face"), this.tracks, capturedAt);
    const objectTracks = tracksForDetections(detections.filter((item) => item.type === "object"), this.tracks, capturedAt);
    const identityById = new Map(profiles.map(({ profile, match }) => [match.personId, profile]));
    const trackedFaces: TrackedFaceResult[] = faces.map((face, index) => {
      const decision = face.descriptor
        ? matchFace(face.descriptor, profiles.map(({ match }) => match), {
            threshold: settings.recognitionThreshold,
            unknownMatchMargin: settings.unknownMatchMargin,
            modelId: result.modelId,
            similarity: (first, second) => engine.similarity(new Float32Array(first), new Float32Array(second)),
          })
        : { status: "unknown" as const, reason: "invalid_descriptor" as const };
      const profile = decision.status === "recognized" ? identityById.get(decision.personId) : undefined;
      return { face, trackId: faceTracks[index]?.id ?? "", decision, ...(profile ? { profile } : {}) };
    });
    const trackedObjects: TrackedObjectResult[] = objects.map((object, index) => {
      const track = objectTracks[index];
      return {
        ...object,
        trackId: track?.id ?? "",
        firstSeenAt: track?.firstSeenAt ?? capturedAt,
        lastSeenAt: track?.lastSeenAt ?? capturedAt,
      };
    });
    const pendingEvents: NewDetectionEvent[] = [
      ...trackedFaces.map(({ face, trackId, decision, profile }) => ({
        timestamp: capturedAt,
        type: decision.status === "recognized" ? "person_recognized" as const : "unknown_face" as const,
        label: profile?.name ?? "Unknown person",
        ...(profile ? { personId: profile.id } : {}),
        ...(trackId ? { trackId } : {}),
        detectorConfidence: face.detectorConfidence,
        ...(decision.status === "recognized" ? { recognitionSimilarity: decision.similarity } : {}),
        boundingBox: face.box,
        mode,
        isDemo: false,
      })),
      ...trackedObjects.map((object) => ({
        timestamp: capturedAt,
        type: "object_detected" as const,
        label: object.className,
        ...(object.trackId ? { trackId: object.trackId } : {}),
        detectorConfidence: object.detectorConfidence,
        boundingBox: object.box,
        mode,
        isDemo: false,
      })),
    ];
    const eventDelta = await this.persistFrameEvents(pendingEvents, capturedAt, epoch, warnings);
    if (!this.isCurrent(epoch)) return;
    if (this.dependencies.updateProfile) {
      const detectedProfiles = new Set(trackedFaces.flatMap(({ decision, profile }) => decision.status === "recognized" && profile ? [profile.id] : []));
      await Promise.all([...detectedProfiles].map((id) => this.dependencies.updateProfile!(id, { lastDetectedAt: capturedAt }).catch((cause: unknown) => {
        warnings.push(cause instanceof Error ? cause.message : "Recognition time could not be saved.");
        return undefined;
      })));
      if (!this.isCurrent(epoch)) return;
    }
    const ended = performance.now();
    this.dependencies.onFrame({
      faces: trackedFaces,
      objects: trackedObjects,
      eventDelta,
      inferenceLatencyMs: Math.max(0, result.inferenceFinishedAt - result.inferenceStartedAt),
      totalLatencyMs: Math.max(0, ended - started),
      measuredFps,
      engineState: engine.status(),
      warnings,
      capturedAt,
    });
  }

  private async loadProfiles(now: number, warnings: string[]): Promise<Array<{ profile: PersonProfile; match: EnrolledProfile }>> {
    if (this.profilesLoaded && now - this.profilesRefreshedAt < PROFILE_REFRESH_MS) return this.enrolledProfiles;
    try {
      const profiles = (await this.dependencies.listProfiles()).filter((profile) => !profile.isDemo);
      const loaded = await Promise.all(profiles.map(async (profile) => ({ profile, templates: await this.dependencies.listTemplatesForPerson(profile.id) })));
      this.enrolledProfiles = loaded.map(({ profile, templates }) => ({ profile, match: { personId: profile.id, templates } }));
      this.profilesRefreshedAt = now;
      this.profilesLoaded = true;
    } catch (cause) {
      warnings.push(cause instanceof Error ? cause.message : "Enrolled people could not be loaded. Faces will remain unknown.");
      this.enrolledProfiles = [];
      this.profilesRefreshedAt = now;
      this.profilesLoaded = true;
    }
    return this.enrolledProfiles;
  }

  private async persistFrameEvents(
    events: NewDetectionEvent[],
    now: number,
    epoch: number,
    warnings: string[],
  ): Promise<DetectionEvent[]> {
    if (!events.length) return [];
    const windowMs = VISION_CONFIG.eventDedupeWindowMs;
    this.recentEvents = this.recentEvents.filter((event) => !event.isDemo && now - event.timestamp < windowMs);
    if (!this.recentEventsLoaded) {
      try {
        this.recentEvents = (await this.dependencies.queryEvents({ from: now - windowMs, limit: 250 })).filter((event) => !event.isDemo);
      } catch (cause) {
        warnings.push(cause instanceof Error ? cause.message : "Recent detection events could not be read.");
      }
      this.recentEventsLoaded = true;
    }
    if (!this.isCurrent(epoch)) return [];
    const accepted = aggregateEvents(this.recentEvents, events, windowMs);
    if (!accepted.length) return [];
    try {
      const saved = await this.dependencies.addEvents(accepted);
      this.recentEvents.push(...saved);
      return saved;
    } catch (cause) {
      warnings.push(cause instanceof Error ? cause.message : "Detection events could not be saved to this device.");
      return [];
    }
  }
}

export async function stopActiveVision(): Promise<void> {
  await Promise.all([...activeLoops].map((loop) => loop.stop()));
}

const localTime = () => Date.now();

export function createDefaultInferenceLoop(
  video: HTMLVideoElement,
  engine: VisionEngine,
  settings: VisionSettings,
  mode: VisionMode,
  onFrame: (frame: FrameViewModel) => void,
  onStop?: () => void,
): InferenceLoop {
  return new InferenceLoop({
    video, engine, settings, mode, onFrame, onStop, now: localTime,
    listProfiles: readProfiles,
    listTemplatesForPerson: readTemplates,
    queryEvents: readEvents,
    addEvents: persistEvents,
    updateProfile: writeProfile,
  });
}
