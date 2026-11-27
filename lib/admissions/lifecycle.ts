import {
  evaluateFinalGate,
  evaluateInitialGate,
  type AdmissionsComponent,
  type RawAdmissionsScores,
} from "@/lib/admissions/scoring";

export type ComponentProgress =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "scoring"
  | "scored"
  | "technical_review_required";

export type AdmissionsProgressStatus =
  | "awaiting_initial_assessments"
  | "automated_scoring_pending"
  | "technical_review_required"
  | "validation_pending"
  | "initial_gate_not_met"
  | "admission_in_progress"
  | "screening_in_progress"
  | "alternative_assessment_pending"
  | "alternative_transfer_opportunity"
  | "recommended_for_admission"
  | "not_admitted";

export interface AdmissionsProgressInput {
  primaryDepartment: string;
  alternativeDepartment?: string | null;
  primaryScores: RawAdmissionsScores;
  primaryProgress: Partial<Record<AdmissionsComponent, ComponentProgress>>;
  alternativeScores?: RawAdmissionsScores;
  alternativeProgress?: Partial<Record<AdmissionsComponent, ComponentProgress>>;
  alternativeTransferAccepted?: boolean;
  rubricEvaluatorValidated: boolean;
  routeCalibrationApproved: boolean;
}

export interface AdmissionsProgressResult {
  status: AdmissionsProgressStatus;
  department: string | null;
  liveDecision: false;
  ruleSetVersion: string;
  reasonCodes: string[];
}

function progressFor(
  component: AdmissionsComponent,
  scores: RawAdmissionsScores,
  states: Partial<Record<AdmissionsComponent, ComponentProgress>>,
): "ready" | "pending" | "active" | "missing" | "technical" {
  const state = states[component] ?? "not_started";
  if (state === "technical_review_required") return "technical";
  if (state === "submitted" || state === "scoring") return "pending";
  if (state === "scored") {
    const score = scores[component];
    return score === null || score === undefined ? "technical" : "ready";
  }
  if (state === "in_progress") return "active";
  return "missing";
}

function inspectRequired(
  components: AdmissionsComponent[],
  scores: RawAdmissionsScores,
  states: Partial<Record<AdmissionsComponent, ComponentProgress>>,
): "ready" | "pending" | "active" | "missing" | "technical" {
  const results = components.map((component) => progressFor(component, scores, states));
  if (results.includes("technical")) return "technical";
  if (results.includes("pending")) return "pending";
  if (results.includes("missing")) return "missing";
  if (results.includes("active")) return "active";
  return "ready";
}

function result(status: AdmissionsProgressStatus, department: string | null, reasonCodes: string[]): AdmissionsProgressResult {
  return {
    status,
    department,
    liveDecision: false,
    ruleSetVersion: "t4sc-admissions-2026-11-27-approved-baseline-v1",
    reasonCodes,
  };
}

/**
 * Deterministic preview of the approved primary/alternative route sequence.
 * The function cannot persist or issue an admission decision. It refuses to
 * evaluate qualification until the automated rubric evaluator and the
 * applicant's route calibration have both been validated.
 */
export function evaluateAdmissionsProgress(input: AdmissionsProgressInput): AdmissionsProgressResult {
  const shared = inspectRequired(
    ["commonReasoning", "learningPotential"],
    input.primaryScores,
    input.primaryProgress,
  );
  if (shared === "technical") return result("technical_review_required", null, ["shared_component_technical_review"]);
  if (shared === "pending") return result("automated_scoring_pending", null, ["shared_component_scoring_pending"]);
  if (shared !== "ready") return result("awaiting_initial_assessments", null, ["shared_components_incomplete"]);

  if (!input.rubricEvaluatorValidated || !input.routeCalibrationApproved) {
    return result("validation_pending", null, [
      ...(!input.rubricEvaluatorValidated ? ["rubric_evaluator_validation_required"] : []),
      ...(!input.routeCalibrationApproved ? ["route_calibration_approval_required"] : []),
    ]);
  }

  const initial = evaluateInitialGate(input.primaryScores);
  if (initial.state === "pending") return result("awaiting_initial_assessments", null, ["initial_gate_scores_missing"]);
  if (initial.state === "not-qualified") return result("initial_gate_not_met", null, ["approved_initial_gate_not_met"]);

  const primary = inspectRequired(
    ["departmentAssessment", "practicalAssessment"],
    input.primaryScores,
    input.primaryProgress,
  );
  if (primary === "technical") return result("technical_review_required", input.primaryDepartment, ["primary_component_technical_review"]);
  if (primary === "pending") return result("automated_scoring_pending", input.primaryDepartment, ["primary_component_scoring_pending"]);
  if (primary === "missing") return result("admission_in_progress", input.primaryDepartment, ["remaining_assessments_not_started"]);
  if (primary === "active") return result("screening_in_progress", input.primaryDepartment, ["primary_assessments_in_progress"]);

  const primaryFinal = evaluateFinalGate(input.primaryScores);
  if (primaryFinal.state === "qualified") {
    return result("recommended_for_admission", input.primaryDepartment, ["approved_final_gate_met"]);
  }

  if (!input.alternativeDepartment) {
    return result("not_admitted", input.primaryDepartment, ["primary_gate_not_met_no_alternative"]);
  }

  const alternativeScores = input.alternativeScores ?? {};
  const alternativeProgress = input.alternativeProgress ?? {};
  const alternative = inspectRequired(
    ["departmentAssessment", "practicalAssessment"],
    alternativeScores,
    alternativeProgress,
  );

  if (alternative === "technical") {
    return result("technical_review_required", input.alternativeDepartment, ["alternative_component_technical_review"]);
  }
  if (alternative === "pending") {
    return result("automated_scoring_pending", input.alternativeDepartment, ["alternative_component_scoring_pending"]);
  }
  if (alternative !== "ready") {
    return result("alternative_assessment_pending", input.alternativeDepartment, ["alternative_route_evidence_required"]);
  }

  const alternativeFinal = evaluateFinalGate({
    commonReasoning: input.primaryScores.commonReasoning,
    learningPotential: input.primaryScores.learningPotential,
    departmentAssessment: alternativeScores.departmentAssessment,
    practicalAssessment: alternativeScores.practicalAssessment,
  });
  if (alternativeFinal.state !== "qualified") {
    return result("not_admitted", input.alternativeDepartment, ["approved_alternative_final_gate_not_met"]);
  }

  if (!input.alternativeTransferAccepted) {
    return result("alternative_transfer_opportunity", input.alternativeDepartment, ["applicant_acceptance_required"]);
  }
  return result("recommended_for_admission", input.alternativeDepartment, ["alternative_transfer_accepted_and_final_gate_met"]);
}

export interface FormalOffer {
  status: "offered" | "accepted" | "declined" | "expired";
  issuedAt: string;
  expiresAt: string;
  department: string;
}

export function createFormalOfferWindow(input: {
  recommendedForAdmission: boolean;
  department: string;
  cycleDay: number;
  cycleStartsAt: string;
  cycleEndsAt: string;
  issuedAt: string;
}): FormalOffer {
  if (!input.recommendedForAdmission) throw new Error("A formal offer requires Recommended for Admission.");
  if (!Number.isInteger(input.cycleDay) || input.cycleDay < 1 || input.cycleDay > 13) {
    throw new RangeError("Formal offers must be issued no later than Day 13.");
  }
  const start = Date.parse(input.cycleStartsAt);
  const end = Date.parse(input.cycleEndsAt);
  const issued = Date.parse(input.issuedAt);
  if (![start, end, issued].every(Number.isFinite) || end <= start || issued < start || issued >= end) {
    throw new RangeError("Offer and cycle timestamps are invalid.");
  }
  const expires = issued + 48 * 60 * 60 * 1000;
  if (expires > end) {
    throw new RangeError("The full 48-hour response window must fit inside the 15-day cycle.");
  }
  return {
    status: "offered",
    issuedAt: new Date(issued).toISOString(),
    expiresAt: new Date(expires).toISOString(),
    department: input.department,
  };
}

export function resolveFormalOfferResponse(
  offer: FormalOffer,
  response: "accept" | "decline",
  respondedAt: string,
): FormalOffer {
  if (offer.status !== "offered") throw new Error("This offer has already been resolved.");
  const issued = Date.parse(offer.issuedAt);
  const expires = Date.parse(offer.expiresAt);
  const responseTime = Date.parse(respondedAt);
  if (![issued, expires, responseTime].every(Number.isFinite) || expires <= issued || responseTime < issued) {
    throw new RangeError("Offer response timestamps are invalid.");
  }
  if (responseTime >= expires) {
    return { ...offer, status: "expired" };
  }
  return { ...offer, status: response === "accept" ? "accepted" : "declined" };
}
