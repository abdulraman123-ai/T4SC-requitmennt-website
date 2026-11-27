/**
 * T4SC admissions scoring baseline.
 *
 * The component weights and initial/final qualification thresholds are
 * founder-approved in the T4SC AI Developer Execution Pack v1.0 (27 Nov 2026).
 * Live decisions remain disabled until automated rubric evaluation is validated
 * and route calibration is approved for the applicant's experience route.
 */
export const ADMISSIONS_RULESET_VERSION = "t4sc-admissions-2026-11-27-approved-baseline-v1" as const;
export const ADMISSIONS_RULESET_STATUS = "approved-baseline-pending-evaluator-and-route-validation" as const;
export const LIVE_ADMISSIONS_DECISIONS_ENABLED = false as const;

export const ADMISSIONS_COMPONENTS = {
  commonReasoning: { rawMaximum: 12, weightedMaximum: 15 },
  departmentAssessment: { rawMaximum: 20, weightedMaximum: 25 },
  learningPotential: { rawMaximum: 20, weightedMaximum: 20 },
  practicalAssessment: { rawMaximum: 40, weightedMaximum: 40 },
} as const;

export type AdmissionsComponent = keyof typeof ADMISSIONS_COMPONENTS;
export type RawAdmissionsScores = Partial<Record<AdmissionsComponent, number | null>>;
type CompleteRawAdmissionsScores = Record<AdmissionsComponent, number>;

export const APPROVED_PROGRESSION_THRESHOLDS = {
  initial: {
    minimumRaw: { commonReasoning: 6, learningPotential: 10 },
    minimumCombinedWeighted: 21,
    maximumCombinedWeighted: 35,
  },
  final: {
    minimumRaw: {
      commonReasoning: 6,
      departmentAssessment: 10,
      learningPotential: 10,
      practicalAssessment: 20,
    },
    minimumOverallWeighted: 70,
    maximumOverallWeighted: 100,
  },
} as const;

/** @deprecated Kept as a compatibility alias; the thresholds are approved. */
export const DRAFT_PROGRESSION_THRESHOLDS = APPROVED_PROGRESSION_THRESHOLDS;

export interface WeightedAdmissionsScore {
  rulesetVersion: typeof ADMISSIONS_RULESET_VERSION;
  rulesetStatus: typeof ADMISSIONS_RULESET_STATUS;
  complete: boolean;
  rawScores: Record<AdmissionsComponent, number | null>;
  weightedScores: Record<AdmissionsComponent, number | null>;
  weightedTotal: number | null;
  missingComponents: AdmissionsComponent[];
}

export type GateState = "pending" | "qualified" | "not-qualified";
export interface GateEvaluation {
  rulesetVersion: typeof ADMISSIONS_RULESET_VERSION;
  rulesetStatus: typeof ADMISSIONS_RULESET_STATUS;
  liveDecision: false;
  state: GateState;
  weightedScore: number | null;
  reasons: string[];
}

/** @deprecated Compatibility aliases for the earlier draft-only API. */
export type DraftGateState = GateState;
export type DraftGateEvaluation = GateEvaluation;

const COMPONENT_KEYS = Object.keys(ADMISSIONS_COMPONENTS) as AdmissionsComponent[];

function isPresentScore(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

function validateRawScore(component: AdmissionsComponent, value: number): void {
  const maximum = ADMISSIONS_COMPONENTS[component].rawMaximum;
  if (!Number.isFinite(value) || value < 0 || value > maximum) {
    throw new RangeError(component + " must be a finite score from 0 to " + maximum + ".");
  }
}

function emptyScoreRecord(): Record<AdmissionsComponent, number | null> {
  return {
    commonReasoning: null,
    departmentAssessment: null,
    learningPotential: null,
    practicalAssessment: null,
  };
}

/**
 * Converts available component marks using raw/rawMaximum*weightedMaximum.
 * Missing scores remain null; the overall total exists only when all four
 * scored components are present. Rounding is for display only.
 */
export function calculateWeightedAdmissionsScore(input: RawAdmissionsScores): WeightedAdmissionsScore {
  const rawScores = emptyScoreRecord();
  const weightedScores = emptyScoreRecord();
  const missingComponents: AdmissionsComponent[] = [];

  for (const component of COMPONENT_KEYS) {
    const score = input[component];
    if (!isPresentScore(score)) {
      missingComponents.push(component);
      continue;
    }
    validateRawScore(component, score);
    rawScores[component] = score;
    const rule = ADMISSIONS_COMPONENTS[component];
    weightedScores[component] = (score / rule.rawMaximum) * rule.weightedMaximum;
  }

  const complete = missingComponents.length === 0;
  const weightedTotal = complete
    ? COMPONENT_KEYS.reduce((total, component) => total + (weightedScores[component] ?? 0), 0)
    : null;

  return {
    rulesetVersion: ADMISSIONS_RULESET_VERSION,
    rulesetStatus: ADMISSIONS_RULESET_STATUS,
    complete,
    rawScores,
    weightedScores,
    weightedTotal,
    missingComponents,
  };
}

/** Applies the approved shared initial gate. This is not a live decision. */
export function evaluateInitialGate(
  input: Pick<RawAdmissionsScores, "commonReasoning" | "learningPotential">,
): GateEvaluation {
  const common = input.commonReasoning;
  const learning = input.learningPotential;

  if (!isPresentScore(common) || !isPresentScore(learning)) {
    return {
      rulesetVersion: ADMISSIONS_RULESET_VERSION,
      rulesetStatus: ADMISSIONS_RULESET_STATUS,
      liveDecision: false,
      state: "pending",
      weightedScore: null,
      reasons: ["Common Reasoning and Learning Potential scores are both required."],
    };
  }

  validateRawScore("commonReasoning", common);
  validateRawScore("learningPotential", learning);

  const combinedWeighted =
    (common / ADMISSIONS_COMPONENTS.commonReasoning.rawMaximum) * ADMISSIONS_COMPONENTS.commonReasoning.weightedMaximum +
    (learning / ADMISSIONS_COMPONENTS.learningPotential.rawMaximum) * ADMISSIONS_COMPONENTS.learningPotential.weightedMaximum;
  const reasons: string[] = [];

  if (common < APPROVED_PROGRESSION_THRESHOLDS.initial.minimumRaw.commonReasoning) {
    reasons.push("Common Reasoning is below the approved component minimum (6/12).");
  }
  if (learning < APPROVED_PROGRESSION_THRESHOLDS.initial.minimumRaw.learningPotential) {
    reasons.push("Learning Potential is below the approved component minimum (10/20).");
  }
  if (combinedWeighted < APPROVED_PROGRESSION_THRESHOLDS.initial.minimumCombinedWeighted) {
    reasons.push("Combined weighted initial score is below the approved threshold (21/35).");
  }

  return {
    rulesetVersion: ADMISSIONS_RULESET_VERSION,
    rulesetStatus: ADMISSIONS_RULESET_STATUS,
    liveDecision: false,
    state: reasons.length === 0 ? "qualified" : "not-qualified",
    weightedScore: combinedWeighted,
    reasons,
  };
}

/** Applies the approved final gate; every component floor is mandatory. */
export function evaluateFinalGate(input: RawAdmissionsScores): GateEvaluation {
  const scoring = calculateWeightedAdmissionsScore(input);
  if (!scoring.complete || scoring.weightedTotal === null) {
    return {
      rulesetVersion: ADMISSIONS_RULESET_VERSION,
      rulesetStatus: ADMISSIONS_RULESET_STATUS,
      liveDecision: false,
      state: "pending",
      weightedScore: null,
      reasons: ["Missing component scores: " + scoring.missingComponents.join(", ") + "."],
    };
  }

  const reasons: string[] = [];
  for (const component of COMPONENT_KEYS) {
    const minimum = APPROVED_PROGRESSION_THRESHOLDS.final.minimumRaw[component];
    const score = scoring.rawScores[component];
    if (score !== null && score < minimum) {
      reasons.push(component + " is below the approved component minimum.");
    }
  }
  if (scoring.weightedTotal < APPROVED_PROGRESSION_THRESHOLDS.final.minimumOverallWeighted) {
    reasons.push("Overall weighted score is below the approved final threshold (70/100).");
  }

  return {
    rulesetVersion: ADMISSIONS_RULESET_VERSION,
    rulesetStatus: ADMISSIONS_RULESET_STATUS,
    liveDecision: false,
    state: reasons.length === 0 ? "qualified" : "not-qualified",
    weightedScore: scoring.weightedTotal,
    reasons,
  };
}

/** @deprecated Use evaluateInitialGate; kept for older feature-branch callers. */
export const evaluateDraftInitialGate = evaluateInitialGate;
/** @deprecated Use evaluateFinalGate; kept for older feature-branch callers. */
export const evaluateDraftFinalGate = evaluateFinalGate;

export function isCompleteAdmissionsScore(input: RawAdmissionsScores): input is CompleteRawAdmissionsScores {
  return COMPONENT_KEYS.every((component) => isPresentScore(input[component]));
}
