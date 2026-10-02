import { describe, expect, it } from "vitest";
import { matchFace, recognizeFaces, type EnrolledProfile } from "../../../src/ai/recognition/matcher";
import { findDuplicateCandidates } from "../../../src/ai/recognition/duplicates";
import type { FaceTemplate } from "../../../src/types/person";
import type { FaceResult } from "../../../src/types/vision";

const template = (personId: string, value: number, modelId = "face-model-v1"): FaceTemplate => ({
  id: `${personId}-${value}`,
  personId,
  descriptor: new Float32Array(1024).fill(value),
  quality: 0.9,
  pose: "front",
  createdAt: 1,
  modelId,
  isDemo: false,
});

const config = {
  threshold: 0.62,
  unknownMatchMargin: 0.05,
  modelId: "face-model-v1",
  similarity: (first: number[], second: number[]) => first[0] === second[0] ? 0.9 : 0.1,
};

describe("conservative face matching", () => {
  it("returnsUnknownBelowThreshold", () => {
    const decision = matchFace(new Float32Array(1024).fill(2), [{ personId: "profile-a", templates: [template("profile-a", 1)] }], {
      ...config,
      similarity: () => 0.61,
    });

    expect(decision).toEqual({ status: "unknown", reason: "below_threshold", bestSimilarity: 0.61 });
  });

  it("returnsUnknownWhenTopMatchesAreTooClose", () => {
    const profiles: EnrolledProfile[] = [
      { personId: "profile-a", templates: [template("profile-a", 1)] },
      { personId: "profile-b", templates: [template("profile-b", 2)] },
    ];
    const decision = matchFace(new Float32Array(1024).fill(9), profiles, {
      ...config,
      similarity: (_first, second) => second[0] === 1 ? 0.83 : 0.80,
    });

    expect(decision).toEqual({ status: "ambiguous", bestSimilarity: 0.83, runnerUpSimilarity: 0.8 });
  });

  it("comparesEachFaceIndependently", () => {
    const profiles: EnrolledProfile[] = [
      { personId: "profile-a", templates: [template("profile-a", 1)] },
      { personId: "profile-b", templates: [template("profile-b", 2)] },
    ];
    const faces: FaceResult[] = [
      { box: { x: 0, y: 0, width: 0.2, height: 0.2 }, detectorConfidence: 0.9, descriptor: new Float32Array(1024).fill(1) },
      { box: { x: 0.5, y: 0, width: 0.2, height: 0.2 }, detectorConfidence: 0.8, descriptor: new Float32Array(1024).fill(2) },
    ];

    expect(recognizeFaces(faces, profiles, config)).toEqual([
      { status: "recognized", personId: "profile-a", similarity: 0.9 },
      { status: "recognized", personId: "profile-b", similarity: 0.9 },
    ]);
  });

  it("rejectsInvalidOrMismatchedVectors", () => {
    const profiles = [{ personId: "profile-a", templates: [
      { ...template("profile-a", 1), descriptor: new Float32Array(12) },
      template("profile-a", 1, "another-model"),
    ] }];
    const invalidQuery = matchFace(new Float32Array([Number.NaN]), profiles, config);
    const noCompatibleTemplates = matchFace(new Float32Array(1024).fill(1), profiles, config);

    expect(invalidQuery).toEqual({ status: "unknown", reason: "invalid_descriptor" });
    expect(noCompatibleTemplates).toEqual({ status: "unknown", reason: "no_compatible_templates" });
  });

  it("doesNotTreatAnAllZeroDescriptorAsARealFace", () => {
    const profiles = [{ personId: "profile-a", templates: [template("profile-a", 1)] }];
    const decision = matchFace(new Float32Array(1024), profiles, { ...config, similarity: () => 0.99 });

    expect(decision).toEqual({ status: "unknown", reason: "invalid_descriptor" });
  });

  it("keepsTheBestTemplateScoreForEachProfile", () => {
    const profiles = [{ personId: "profile-a", templates: [template("profile-a", 1), template("profile-a", 2)] }];
    const decision = matchFace(new Float32Array(1024).fill(9), profiles, {
      ...config,
      similarity: (_first, second) => second[0] === 2 ? 0.88 : 0.70,
    });

    expect(decision).toEqual({ status: "recognized", personId: "profile-a", similarity: 0.88 });
  });

  it("returnsDuplicateCandidatesForReviewWithoutChangingEnrollment", () => {
    const profiles = [{ personId: "profile-a", templates: [template("profile-a", 1)] }];
    const before = profiles[0]!.templates[0]!.descriptor.slice();
    const candidates = findDuplicateCandidates(new Float32Array(1024).fill(2), profiles, {
      modelId: config.modelId,
      similarity: () => 0.84,
    });

    expect(candidates).toEqual([{ personId: "profile-a", similarity: 0.84 }]);
    expect(profiles[0]!.templates[0]!.descriptor).toEqual(before);
  });

  it("neverChoosesAProfileOnAnExactTieEvenWithZeroConfiguredMargin", () => {
    const profiles: EnrolledProfile[] = [
      { personId: "profile-a", templates: [template("profile-a", 1)] },
      { personId: "profile-b", templates: [template("profile-b", 2)] },
    ];
    const decision = matchFace(new Float32Array(1024).fill(3), profiles, {
      ...config,
      unknownMatchMargin: 0,
      similarity: () => 0.8,
    });

    expect(decision.status).toBe("ambiguous");
  });
});
