import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMISSIONS_COMPONENTS,
  ADMISSIONS_RULESET_STATUS,
  ADMISSIONS_RULESET_VERSION,
  APPROVED_PROGRESSION_THRESHOLDS,
  LIVE_ADMISSIONS_DECISIONS_ENABLED,
  calculateWeightedAdmissionsScore,
  evaluateFinalGate,
  evaluateInitialGate,
  isCompleteAdmissionsScore,
} from "../lib/admissions/scoring.ts";

test("publishes the approved, versioned baseline while keeping live decisions disabled", () => {
  assert.equal(ADMISSIONS_RULESET_VERSION, "t4sc-admissions-2026-11-27-approved-baseline-v1");
  assert.equal(ADMISSIONS_RULESET_STATUS, "approved-baseline-pending-evaluator-and-route-validation");
  assert.equal(LIVE_ADMISSIONS_DECISIONS_ENABLED, false);
});

test("component maxima and weighting produce 100 points in total", () => {
  const result = calculateWeightedAdmissionsScore({
    commonReasoning: 12, departmentAssessment: 20, learningPotential: 20, practicalAssessment: 40,
  });
  assert.equal(result.complete, true);
  assert.equal(result.weightedScores.commonReasoning, 15);
  assert.equal(result.weightedScores.departmentAssessment, 25);
  assert.equal(result.weightedScores.learningPotential, 20);
  assert.equal(result.weightedScores.practicalAssessment, 40);
  assert.equal(result.weightedTotal, 100);
  assert.deepEqual(result.missingComponents, []);
  assert.equal(Object.values(ADMISSIONS_COMPONENTS).reduce((sum,item)=>sum+item.weightedMaximum,0),100);
});

test("keeps full precision instead of rounding weighted component scores", () => {
  const result=calculateWeightedAdmissionsScore({
    commonReasoning:7,departmentAssessment:13,learningPotential:11,practicalAssessment:27,
  });
  assert.equal(result.weightedScores.commonReasoning,(7/12)*15);
  assert.equal(result.weightedScores.departmentAssessment,(13/20)*25);
  assert.equal(result.weightedScores.learningPotential,11);
  assert.equal(result.weightedScores.practicalAssessment,27);
});

test("missing component marks stay null and the total stays pending", () => {
  const result=calculateWeightedAdmissionsScore({commonReasoning:12,learningPotential:20});
  assert.equal(result.complete,false);
  assert.equal(result.rawScores.departmentAssessment,null);
  assert.equal(result.weightedScores.departmentAssessment,null);
  assert.equal(result.weightedTotal,null);
  assert.deepEqual(result.missingComponents,["departmentAssessment","practicalAssessment"]);
});

test("rejects non-finite, negative and above-maximum component marks", () => {
  assert.throws(()=>calculateWeightedAdmissionsScore({commonReasoning:-1}),RangeError);
  assert.throws(()=>calculateWeightedAdmissionsScore({commonReasoning:12.01}),RangeError);
  assert.throws(()=>calculateWeightedAdmissionsScore({departmentAssessment:Number.NaN}),RangeError);
  assert.throws(()=>calculateWeightedAdmissionsScore({practicalAssessment:Number.POSITIVE_INFINITY}),RangeError);
});

test("approved initial gate remains pending until both shared components exist", () => {
  const result=evaluateInitialGate({commonReasoning:12});
  assert.equal(result.state,"pending");
  assert.equal(result.weightedScore,null);
  assert.equal(result.liveDecision,false);
});

test("approved initial gate enforces both component floors and the combined 21/35 threshold", () => {
  const passes=evaluateInitialGate({commonReasoning:12,learningPotential:18});
  const belowFloor=evaluateInitialGate({commonReasoning:5,learningPotential:20});
  const belowCombined=evaluateInitialGate({commonReasoning:6,learningPotential:10});
  assert.equal(passes.state,"qualified");
  assert.equal(passes.weightedScore,33);
  assert.equal(belowFloor.state,"not-qualified");
  assert.ok(belowFloor.reasons.some(x=>x.includes("Common Reasoning")));
  assert.equal(belowCombined.state,"not-qualified");
  assert.ok(belowCombined.reasons.some(x=>x.includes("21/35")));
  assert.equal(APPROVED_PROGRESSION_THRESHOLDS.initial.maximumCombinedWeighted,35);
});

test("approved final gate requires every scored component", () => {
  const result=evaluateFinalGate({commonReasoning:12,departmentAssessment:20,learningPotential:20});
  assert.equal(result.state,"pending");
  assert.equal(result.weightedScore,null);
});

test("approved final gate requires all component floors and 70/100", () => {
  const passes=evaluateFinalGate({commonReasoning:10,departmentAssessment:16,learningPotential:16,practicalAssessment:30});
  const highTotalLowFloor=evaluateFinalGate({commonReasoning:5,departmentAssessment:20,learningPotential:20,practicalAssessment:40});
  const floorsOnly=evaluateFinalGate({commonReasoning:6,departmentAssessment:10,learningPotential:10,practicalAssessment:20});
  assert.equal(passes.state,"qualified");
  assert.equal(passes.weightedScore,78.5);
  assert.equal(highTotalLowFloor.state,"not-qualified");
  assert.ok(highTotalLowFloor.reasons.some(x=>x.includes("commonReasoning")));
  assert.equal(floorsOnly.state,"not-qualified");
  assert.ok(floorsOnly.reasons.some(x=>x.includes("70/100")));
});

test("complete-score guard rejects partial records", () => {
  assert.equal(isCompleteAdmissionsScore({commonReasoning:12,departmentAssessment:20,learningPotential:20}),false);
  assert.equal(isCompleteAdmissionsScore({commonReasoning:12,departmentAssessment:20,learningPotential:20,practicalAssessment:40}),true);
});
