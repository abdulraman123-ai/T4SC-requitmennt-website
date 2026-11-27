export interface AssessmentAnswerKey {
  question_id: string;
  correct_value: string;
}
export interface ObjectiveScore {
  score: number;
  maximum: number;
  questionCount: number;
}
/** Scores objective choices only; the server fetches keys from a restricted database table. */
export function scoreObjectiveAnswers(submitted: unknown, keys: AssessmentAnswerKey[]): ObjectiveScore {
  if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) {
    throw new TypeError("Multiple-choice answers must be an object.");
  }
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("The server-side answer key is unavailable.");
  }
  const answers = submitted as Record<string, unknown>;
  const keyIds = new Set(keys.map((key) => key.question_id));
  const submittedIds = Object.keys(answers);
  if (keyIds.size !== keys.length || submittedIds.length !== keys.length ||
      submittedIds.some((id) => !keyIds.has(id))) {
    throw new Error("The submitted answer set does not match the active assessment.");
  }
  let score = 0;
  for (const key of keys) {
    const value = answers[key.question_id];
    if (typeof value !== "string" || !/^(0|1|2|3)$/.test(value)) {
      throw new TypeError("Each selected answer must be a valid option index.");
    }
    if (value === key.correct_value) score += 1;
  }
  return { score, maximum: keys.length, questionCount: keys.length };
}
