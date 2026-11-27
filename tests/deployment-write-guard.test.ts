import assert from "node:assert/strict";
import test from "node:test";
import { shouldBlockT4SCAction } from "../lib/t4sc-api-policy.ts";

test("preview deployments block application and assessment writes", () => {
  const preview = { VERCEL_ENV: "preview", NODE_ENV: "production", T4SC_PREVIEW_READ_ONLY: "true" };
  for (const action of ["application_submit", "assessment_submit", "attempt_start", "attempt_save"] as const) {
    assert.equal(shouldBlockT4SCAction(action, preview), true);
  }
});

test("preview deployments still permit read-only status and attempt reads", () => {
  const preview = { VERCEL_ENV: "preview", NODE_ENV: "production", T4SC_PREVIEW_READ_ONLY: "true" };
  assert.equal(shouldBlockT4SCAction("status_lookup", preview), false);
  assert.equal(shouldBlockT4SCAction("attempt_read", preview), false);
});

test("production permits normal applicant actions", () => {
  const production = { VERCEL_ENV: "production", NODE_ENV: "production", T4SC_PREVIEW_READ_ONLY: "false" };
  assert.equal(shouldBlockT4SCAction("application_submit", production), false);
  assert.equal(shouldBlockT4SCAction("attempt_start", production), false);
  assert.equal(shouldBlockT4SCAction("assessment_submit", production), false);
  assert.equal(shouldBlockT4SCAction("offer_respond", production), false);
});

test("development defaults to read-only unless explicitly running production", () => {
  assert.equal(shouldBlockT4SCAction("application_submit", { NODE_ENV: "development" }), true);
  assert.equal(shouldBlockT4SCAction("attempt_save", {}), true);
  assert.equal(shouldBlockT4SCAction("offer_respond", {}), true);
});
