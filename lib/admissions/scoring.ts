/**
 * T4SC admissions scoring model (draft, intentionally not wired to production).
 * Source: T4SC AI Developer Execution Pack v1.0, 27 November 2026.
 *
 * Component maxima and weighted conversion are implemented here. Candidate
 * gates are included for review only: final thresholds/minima still require
 * founder approval and route calibration. Never issue live decisions from
 * this module.
 */
export const ADMISSIONS_RULESET_VERSION = "t4sc-2026-11-27-draft-1" as const;
export const ADMISSIONS_RULESET_STATUS = "draft-not-for-production" as const;
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

/**
 * Candidate gates transcribed from the opening execution manual.
 * Inactive pending final founder approval, route calibration and validation.
 */
export const DRAFT_PROGRESSION_THRESHOLDS = {
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

export interface WeightedAdmissionsScore {
  rulesetVersion: typeof ADMISSIONS_RULESET_VERSION;
  rulesetStatus: typeof ADMISSIONS_RULESET_STATUS;
  complete: boolean;
  rawScores: Record<AdmissionsComponent, number | null>;
  weightedScores: Record<AdmissionsComponent, number | null>;
  weightedTotal: number | null;
  missingComponents: AdmissionsComponent[];
}

export type DraftGateState = "pending" | "draft-pass" | "draft-not-pass";

export interface DraftGateEvaluation {
  rulesetVersion: typeof ADMISSIONS_RULESET_VERSION;
  rulesetStatus: typeof ADMISSIONS_RULESET_STATUS;
  liveDecision: false;
  state: DraftGateState;
  weightedScore: number | null;
  reasons: string[];
}

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
 * Converts available component scores using raw/rawMaximum*weightedMaximum.
 * Missing values remain null, never zero. The total is available only when
 * all four component scores have been supplied.
 */
export function calculateWeightedAdmissionsScore(
  input: RawAdmissionsScores,
): WeightedAdmissionsScore {
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

/**
 * Evaluates the candidate initial checkpoint only. It does not grant admission.
 * The result is always labelled draft and cannot be used by production flows.
 */
export function evaluateDraftInitialGate(
  input: Pick<RawAdmissionsScores, "commonReasoning" | "learningPotential">,
): DraftGateEvaluation {
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

  if (common < DRAFT_PROGRESSION_THRESHOLDS.initial.minimumRaw.commonReasoning) {
    reasons.push("Common Reasoning is below the candidate component minimum.");
  }
  if (learning < DRAFT_PROGRESSION_THRESHOLDS.initial.minimumRaw.learningPotential) {
    reasons.push("Learning Potential is below the candidate component minimum.");
  }
  if (combinedWeighted < DRAFT_PROGRESSION_THRESHOLDS.initial.minimumCombinedWeighted) {
    reasons.push("Combined weighted initial score is below the candidate checkpoint threshold.");
  }

  return {
    rulesetVersion: ADMISSIONS_RULESET_VERSION,
    rulesetStatus: ADMISSIONS_RULESET_STATUS,
    liveDecision: false,
    state: reasons.length === 0 ? "draft-pass" : "draft-not-pass",
    weightedScore: combinedWeighted,
    reasons,
  };
}

/**
 * Evaluates the four candidate final-gate criteria. Missing marks remain
 * pending; a high total cannot compensate for a failed component floor.
 */
export function evaluateDraftFinalGate(input: RawAdmissionsScores): DraftGateEvaluation {
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
    const minimum = DRAFT_PROGRESSION_THRESHOLDS.final.minimumRaw[component];
    const score = scoring.rawScores[component];
    if (score !== null && score < minimum) {
      reasons.push(component + " is below the candidate component minimum.");
    }
  }
  if (scoring.weightedTotal < DRAFT_PROGRESSION_THRESHOLDS.final.minimumOverallWeighted) {
    reasons.push("Overall weighted score is below the candidate final threshold.");
  }

  return {
    rulesetVersion: ADMISSIONS_RULESET_VERSION,
    rulesetStatus: ADMISSIONS_RULESET_STATUS,
    liveDecision: false,
    state: reasons.length === 0 ? "draft-pass" : "draft-not-pass",
    weightedScore: scoring.weightedTotal,
    reasons,
  };
}

/** Shape helper for services that require all four numeric component marks. */
export function isCompleteAdmissionsScore(input: RawAdmissionsScores): input is CompleteRawAdmissionsScores {
  return COMPONENT_KEYS.every((component) => isPresentScore(input[component]));
}
