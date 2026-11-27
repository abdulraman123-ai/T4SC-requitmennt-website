import assert from "node:assert/strict";
import test from "node:test";
import { scoreObjectiveAnswers } from "../supabase/functions/_shared/assessment-scoring.ts";

const keys = [
  { question_id: "q1", correct_value: "0" },
  { question_id: "q2", correct_value: "2" },
  { question_id: "q3", correct_value: "1" },
];

test("scores objective answers against a server-provided answer key", () => {
  assert.deepEqual(scoreObjectiveAnswers({ q1: "0", q2: "0", q3: "1" }, keys), {
    score: 2, maximum: 3, questionCount: 3,
  });
});
test("rejects an incomplete answer set", () => {
  assert.throws(() => scoreObjectiveAnswers({ q1: "0", q2: "2" }, keys), /does not match/);
});
test("rejects unexpected question identifiers", () => {
  assert.throws(() => scoreObjectiveAnswers({ q1: "0", q2: "2", other: "1" }, keys), /does not match/);
});
test("rejects malformed option values", () => {
  assert.throws(() => scoreObjectiveAnswers({ q1: "correct", q2: "2", q3: "1" }, keys), /valid option index/);
});
test("fails closed when the server-side key is missing", () => {
  assert.throws(() => scoreObjectiveAnswers({ q1: "0" }, []), /answer key is unavailable/);
});
