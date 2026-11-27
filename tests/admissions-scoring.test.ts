import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMISSIONS_COMPONENTS,
  ADMISSIONS_RULESET_STATUS,
  ADMISSIONS_RULESET_VERSION,
  DRAFT_PROGRESSION_THRESHOLDS,
  LIVE_ADMISSIONS_DECISIONS_ENABLED,
  calculateWeightedAdmissionsScore,
  evaluateDraftFinalGate,
  evaluateDraftInitialGate,
  isCompleteAdmissionsScore,
} from "../lib/admissions/scoring.ts";

test("publishes a versioned ruleset that is explicitly inactive", () => {
  assert.equal(ADMISSIONS_RULESET_VERSION, "t4sc-2026-11-27-draft-1");
  assert.equal(ADMISSIONS_RULESET_STATUS, "draft-not-for-production");
  assert.equal(LIVE_ADMISSIONS_DECISIONS_ENABLED, false);
});

test("component maxima and weighting produce 100 points in total", () => {
  const result = calculateWeightedAdmissionsScore({
    commonReasoning: 12,
    departmentAssessment: 20,
    learningPotential: 20,
    practicalAssessment: 40,
  });
  assert.equal(result.complete, true);
  assert.equal(result.weightedScores.commonReasoning, 15);
  assert.equal(result.weightedScores.departmentAssessment, 25);
  assert.equal(result.weightedScores.learningPotential, 20);
  assert.equal(result.weightedScores.practicalAssessment, 40);
  assert.equal(result.weightedTotal, 100);
  assert.deepEqual(result.missingComponents, []);
  assert.equal(Object.values(ADMISSIONS_COMPONENTS).reduce((sum, item) => sum + item.weightedMaximum, 0), 100);
});

test("keeps full precision instead of rounding weighted component scores", () => {
  const result = calculateWeightedAdmissionsScore({
    commonReasoning: 7,
    departmentAssessment: 13,
    learningPotential: 11,
    practicalAssessment: 27,
  });
  assert.equal(result.weightedScores.commonReasoning, (7 / 12) * 15);
  assert.equal(result.weightedScores.departmentAssessment, (13 / 20) * 25);
  assert.equal(result.weightedScores.learningPotential, 11);
  assert.equal(result.weightedScores.practicalAssessment, 27);
});

test("missing component marks stay null and the total stays pending", () => {
  const result = calculateWeightedAdmissionsScore({ commonReasoning: 12, learningPotential: 20 });
  assert.equal(result.complete, false);
  assert.equal(result.rawScores.departmentAssessment, null);
  assert.equal(result.weightedScores.departmentAssessment, null);
  assert.equal(result.weightedTotal, null);
  assert.deepEqual(result.missingComponents, ["departmentAssessment", "practicalAssessment"]);
});

test("rejects non-finite, negative and above-maximum component marks", () => {
  assert.throws(() => calculateWeightedAdmissionsScore({ commonReasoning: -1 }), RangeError);
  assert.throws(() => calculateWeightedAdmissionsScore({ commonReasoning: 12.01 }), RangeError);
  assert.throws(() => calculateWeightedAdmissionsScore({ departmentAssessment: Number.NaN }), RangeError);
  assert.throws(() => calculateWeightedAdmissionsScore({ practicalAssessment: Number.POSITIVE_INFINITY }), RangeError);
});

test("initial candidate gate stays pending until both required components exist", () => {
  const result = evaluateDraftInitialGate({ commonReasoning: 12 });
  assert.equal(result.state, "pending");
  assert.equal(result.weightedScore, null);
  assert.equal(result.liveDecision, false);
});

test("initial candidate gate requires both floors and the combined weighted threshold", () => {
  const passes = evaluateDraftInitialGate({ commonReasoning: 10, learningPotential: 10 });
  const belowComponentFloor = evaluateDraftInitialGate({ commonReasoning: 5, learningPotential: 20 });
  const belowCombinedThreshold = evaluateDraftInitialGate({ commonReasoning: 6, learningPotential: 10 });

  assert.equal(passes.state, "draft-pass");
  assert.equal(passes.weightedScore, 22.5);
  assert.equal(belowComponentFloor.state, "draft-not-pass");
  assert.ok(belowComponentFloor.reasons.some((reason) => reason.includes("Common Reasoning")));
  assert.equal(belowCombinedThreshold.state, "draft-not-pass");
  assert.ok(belowCombinedThreshold.reasons.some((reason) => reason.toLowerCase().includes("combined weighted")));
  assert.equal(DRAFT_PROGRESSION_THRESHOLDS.initial.maximumCombinedWeighted, 35);
});

test("final candidate gate requires every component score", () => {
  const result = evaluateDraftFinalGate({
    commonReasoning: 12,
    departmentAssessment: 20,
    learningPotential: 20,
  });
  assert.equal(result.state, "pending");
  assert.equal(result.weightedScore, null);
});

test("final candidate gate checks each component floor independently", () => {
  const passes = evaluateDraftFinalGate({
    commonReasoning: 10,
    departmentAssessment: 16,
    learningPotential: 16,
    practicalAssessment: 30,
  });
  const highTotalButCommonReasoningBelowFloor = evaluateDraftFinalGate({
    commonReasoning: 5,
    departmentAssessment: 20,
    learningPotential: 20,
    practicalAssessment: 40,
  });
  const allFloorsMetButTotalBelowThreshold = evaluateDraftFinalGate({
    commonReasoning: 6,
    departmentAssessment: 10,
    learningPotential: 10,
    practicalAssessment: 20,
  });

  assert.equal(passes.state, "draft-pass");
  assert.equal(passes.weightedScore, 78.5);
  assert.equal(highTotalButCommonReasoningBelowFloor.state, "draft-not-pass");
  assert.ok(highTotalButCommonReasoningBelowFloor.reasons.some((reason) => reason.includes("commonReasoning")));
  assert.equal(allFloorsMetButTotalBelowThreshold.state, "draft-not-pass");
  assert.ok(allFloorsMetButTotalBelowThreshold.reasons.some((reason) => reason.includes("Overall weighted score")));
});

test("complete-score guard rejects partial records", () => {
  assert.equal(isCompleteAdmissionsScore({ commonReasoning: 12, departmentAssessment: 20, learningPotential: 20 }), false);
  assert.equal(isCompleteAdmissionsScore({
    commonReasoning: 12,
    departmentAssessment: 20,
    learningPotential: 20,
    practicalAssessment: 40,
  }), true);
});
