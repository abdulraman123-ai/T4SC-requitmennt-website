import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ATTEMPT_RESPONSE_BYTES,
  hashAttemptToken,
  isResponsePayload,
  isResponseVersion,
  isStaleResponseVersion,
  isValidUuid,
} from "../supabase/functions/t4sc-api/_shared/attempt-security.ts";

const token = "c6eaa02d-3566-4a01-92c6-5bb99ea2b053";

test("attempt tokens are validated as UUIDs", () => {
  assert.equal(isValidUuid(token), true);
  assert.equal(isValidUuid("not-a-token"), false);
});

test("attempt token hashes are stable and do not expose the token", async () => {
  const first = await hashAttemptToken(token);
  const second = await hashAttemptToken(token);
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.notEqual(first, token);
});

test("different attempt tokens produce different hashes", async () => {
  const first = await hashAttemptToken(token);
  const second = await hashAttemptToken("cc5785f2-95e2-4f8d-9ec4-3f6ecbfe5db0");
  assert.notEqual(first, second);
});

test("checkpoint versions must be positive safe integers", () => {
  assert.equal(isResponseVersion(1), true);
  assert.equal(isResponseVersion(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isResponseVersion(0), false);
  assert.equal(isResponseVersion(-1), false);
  assert.equal(isResponseVersion(1.5), false);
  assert.equal(isResponseVersion(Number.MAX_SAFE_INTEGER + 1), false);
});

test("older or duplicate checkpoints are identified as stale", () => {
  assert.equal(isStaleResponseVersion(5, 4), true);
  assert.equal(isStaleResponseVersion(5, 5), true);
  assert.equal(isStaleResponseVersion(5, 6), false);
});

test("checkpoint payload must be a JSON object within the size limit", () => {
  assert.equal(isResponsePayload({ q1: "1", written: "Reasoning" }), true);
  assert.equal(isResponsePayload(null), false);
  assert.equal(isResponsePayload(["not", "an", "object"]), false);
  assert.equal(isResponsePayload("text"), false);
  assert.equal(isResponsePayload({ text: "x".repeat(MAX_ATTEMPT_RESPONSE_BYTES + 1) }), false);
});
