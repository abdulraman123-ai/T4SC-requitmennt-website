import assert from "node:assert/strict";
import test from "node:test";
import { isApplicationOwnedByUser } from "../supabase/functions/t4sc-api/_shared/application-owner.ts";

const applicant = { id: "11111111-1111-4111-8111-111111111111", email: "applicant@example.com" };

test("a linked application belongs only to the matching authenticated user", () => {
  assert.equal(isApplicationOwnedByUser({ auth_user_id: applicant.id }, applicant, "APPLICANT@example.com"), true);
  assert.equal(isApplicationOwnedByUser({ auth_user_id: "22222222-2222-4222-8222-222222222222" }, applicant, "applicant@example.com"), false);
});

test("matching email text cannot claim a legacy application without an owner id", () => {
  assert.equal(isApplicationOwnedByUser({ auth_user_id: null }, applicant, "applicant@example.com"), false);
  assert.equal(isApplicationOwnedByUser({}, applicant, "applicant@example.com"), false);
});

test("session email and requested email must agree as well as the owner id", () => {
  assert.equal(isApplicationOwnedByUser({ auth_user_id: applicant.id }, applicant, "someone-else@example.com"), false);
  assert.equal(isApplicationOwnedByUser({ auth_user_id: applicant.id }, { id: applicant.id, email: null }, "applicant@example.com"), false);
});
