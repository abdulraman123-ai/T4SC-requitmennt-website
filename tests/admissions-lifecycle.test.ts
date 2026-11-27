import assert from "node:assert/strict";
import test from "node:test";
import {
  createFormalOfferWindow,
  evaluateAdmissionsProgress,
  resolveFormalOfferResponse,
} from "../lib/admissions/lifecycle.ts";
import type { AdmissionsProgressInput } from "../lib/admissions/lifecycle.ts";

const fullScores={commonReasoning:8,departmentAssessment:16,learningPotential:16,practicalAssessment:30};
const scored={commonReasoning:"scored" as const,learningPotential:"scored" as const,departmentAssessment:"scored" as const,practicalAssessment:"scored" as const};
const validBase:AdmissionsProgressInput={
  primaryDepartment:"AI & Machine Learning",
  alternativeDepartment:"Game Development",
  primaryScores:fullScores,
  primaryProgress:scored,
  rubricEvaluatorValidated:true,
  routeCalibrationApproved:true,
};

test("waits for shared initial components before evaluating the gate",()=>{
  const result=evaluateAdmissionsProgress({...validBase,primaryProgress:{commonReasoning:"scored"}});
  assert.equal(result.status,"awaiting_initial_assessments");
});

test("scoring failures enter technical review instead of a zero or rejection",()=>{
  const result=evaluateAdmissionsProgress({...validBase,primaryProgress:{...scored,learningPotential:"technical_review_required"}});
  assert.equal(result.status,"technical_review_required");
});

test("submitted shared assessments remain pending until their score is confirmed",()=>{
  const result=evaluateAdmissionsProgress({...validBase,primaryProgress:{...scored,learningPotential:"submitted"}});
  assert.equal(result.status,"automated_scoring_pending");
});

test("qualification cannot drive a decision until evaluator and route validation are approved",()=>{
  const result=evaluateAdmissionsProgress({...validBase,rubricEvaluatorValidated:false,routeCalibrationApproved:false});
  assert.equal(result.status,"validation_pending");
  assert.ok(result.reasonCodes.includes("rubric_evaluator_validation_required"));
  assert.ok(result.reasonCodes.includes("route_calibration_approval_required"));
  assert.equal(result.liveDecision,false);
});

test("passing the initial gate unlocks the remaining assessments",()=>{
  const result=evaluateAdmissionsProgress({...validBase,primaryProgress:{commonReasoning:"scored",learningPotential:"scored"}});
  assert.equal(result.status,"admission_in_progress");
  assert.equal(result.department,"AI & Machine Learning");
});

test("started remaining assessments appear as Screening in Progress",()=>{
  const result=evaluateAdmissionsProgress({...validBase,primaryProgress:{...scored,practicalAssessment:"in_progress"}});
  assert.equal(result.status,"screening_in_progress");
});

test("a complete primary route meeting every final criterion is recommended",()=>{
  const result=evaluateAdmissionsProgress(validBase);
  assert.equal(result.status,"recommended_for_admission");
  assert.equal(result.department,"AI & Machine Learning");
});

test("primary failure waits for alternative-route-specific evidence",()=>{
  const result=evaluateAdmissionsProgress({
    ...validBase,
    primaryScores:{...fullScores,departmentAssessment:8},
    alternativeScores:{commonReasoning:8,learningPotential:16},
    alternativeProgress:{commonReasoning:"scored",learningPotential:"scored"},
  });
  assert.equal(result.status,"alternative_assessment_pending");
  assert.equal(result.department,"Game Development");
});

test("alternative route requires applicant acceptance before recommendation",()=>{
  const result=evaluateAdmissionsProgress({
    ...validBase,
    primaryScores:{...fullScores,departmentAssessment:8},
    alternativeScores:fullScores,
    alternativeProgress:scored,
  });
  assert.equal(result.status,"alternative_transfer_opportunity");
  assert.ok(result.reasonCodes.includes("applicant_acceptance_required"));
});

test("accepted alternative transfer advances only after the alternative final gate is met",()=>{
  const result=evaluateAdmissionsProgress({
    ...validBase,
    primaryScores:{...fullScores,departmentAssessment:8},
    alternativeScores:fullScores,
    alternativeProgress:scored,
    alternativeTransferAccepted:true,
  });
  assert.equal(result.status,"recommended_for_admission");
  assert.equal(result.department,"Game Development");
});

test("failed primary and alternative gates result in not admitted",()=>{
  const result=evaluateAdmissionsProgress({
    ...validBase,
    primaryScores:{...fullScores,departmentAssessment:8},
    alternativeScores:{...fullScores,departmentAssessment:8},
    alternativeProgress:scored,
  });
  assert.equal(result.status,"not_admitted");
});

test("formal offers may issue through Day 13 with a full 48-hour response period",()=>{
  const offer=createFormalOfferWindow({
    recommendedForAdmission:true,department:"AI & Machine Learning",cycleDay:13,
    cycleStartsAt:"2026-11-01T00:00:00Z",cycleEndsAt:"2026-11-16T00:00:00Z",
    issuedAt:"2026-11-14T00:00:00Z",
  });
  assert.equal(offer.expiresAt,"2026-11-16T00:00:00.000Z");
});

test("formal offer issuance is blocked after Day 13",()=>{
  assert.throws(()=>createFormalOfferWindow({
    recommendedForAdmission:true,department:"AI & Machine Learning",cycleDay:14,
    cycleStartsAt:"2026-11-01T00:00:00Z",cycleEndsAt:"2026-11-16T00:00:00Z",
    issuedAt:"2026-11-14T00:00:00Z",
  }),/Day 13/);
});

test("formal offer requires a full 48 hours inside the cycle",()=>{
  assert.throws(()=>createFormalOfferWindow({
    recommendedForAdmission:true,department:"AI & Machine Learning",cycleDay:13,
    cycleStartsAt:"2026-11-01T00:00:00Z",cycleEndsAt:"2026-11-15T23:59:59Z",
    issuedAt:"2026-11-14T00:00:00Z",
  }),/48-hour/);
});

test("offer response is accepted before expiry and expires at the exact deadline",()=>{
  const offer=createFormalOfferWindow({
    recommendedForAdmission:true,department:"AI & Machine Learning",cycleDay:13,
    cycleStartsAt:"2026-11-01T00:00:00Z",cycleEndsAt:"2026-11-16T00:00:00Z",
    issuedAt:"2026-11-14T00:00:00Z",
  });
  assert.equal(resolveFormalOfferResponse(offer,"accept","2026-11-15T23:59:59Z").status,"accepted");
  assert.equal(resolveFormalOfferResponse(offer,"decline","2026-11-16T00:00:00Z").status,"expired");
});

test("the same offer response can be safely retried but a reversal is rejected",()=>{
  const offer=createFormalOfferWindow({
    recommendedForAdmission:true,department:"AI & Machine Learning",cycleDay:13,
    cycleStartsAt:"2026-11-01T00:00:00Z",cycleEndsAt:"2026-11-16T00:00:00Z",
    issuedAt:"2026-11-14T00:00:00Z",
  });
  const accepted=resolveFormalOfferResponse(offer,"accept","2026-11-15T10:00:00Z");
  assert.equal(resolveFormalOfferResponse(accepted,"accept","2026-11-15T11:00:00Z"),accepted);
  assert.throws(()=>resolveFormalOfferResponse(accepted,"decline","2026-11-15T11:00:00Z"),/already been resolved/);

  const declined=resolveFormalOfferResponse(offer,"decline","2026-11-15T10:00:00Z");
  assert.equal(resolveFormalOfferResponse(declined,"decline","2026-11-15T11:00:00Z"),declined);
  assert.throws(()=>resolveFormalOfferResponse(declined,"accept","2026-11-15T11:00:00Z"),/already been resolved/);
});

test("an already-expired offer remains expired when a response is retried",()=>{
  const offer=createFormalOfferWindow({
    recommendedForAdmission:true,department:"AI & Machine Learning",cycleDay:13,
    cycleStartsAt:"2026-11-01T00:00:00Z",cycleEndsAt:"2026-11-16T00:00:00Z",
    issuedAt:"2026-11-14T00:00:00Z",
  });
  const expired=resolveFormalOfferResponse(offer,"accept","2026-11-16T00:00:00Z");
  assert.equal(resolveFormalOfferResponse(expired,"accept","2026-11-16T00:00:01Z"),expired);
});
