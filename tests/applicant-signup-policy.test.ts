import assert from "node:assert/strict";
import test from "node:test";
import {
  isT4SCMutationAction,
  shouldBlockT4SCAction,
} from "../lib/t4sc-api-policy.ts";

test("applicant account creation is treated as a database mutation", () => {
  assert.equal(isT4SCMutationAction("applicant_signup"), true);
});

test("applicant account creation is blocked from preview deployments", () => {
  assert.equal(shouldBlockT4SCAction("applicant_signup", {
    VERCEL_ENV: "preview",
    NODE_ENV: "production",
  }), true);
});

test("applicant account creation is allowed in production", () => {
  assert.equal(shouldBlockT4SCAction("applicant_signup", {
    VERCEL_ENV: "production",
    NODE_ENV: "production",
  }), false);
});
