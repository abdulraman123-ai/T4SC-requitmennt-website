import assert from "node:assert/strict";
import test from "node:test";
import { constantTimeEqual, sha256Hex } from "../supabase/functions/t4sc-api/_shared/proxy-security.ts";

test("proxy secret hashes are stable SHA-256 hex digests", async () => {
  const digest = await sha256Hex("example-proxy-secret");
  assert.equal(digest.length, 64);
  assert.equal(digest, await sha256Hex("example-proxy-secret"));
  assert.notEqual(digest, "example-proxy-secret");
});

test("proxy credentials are compared without early character exits", () => {
  assert.equal(constantTimeEqual("a".repeat(64), "a".repeat(64)), true);
  assert.equal(constantTimeEqual("a".repeat(64), "b".repeat(64)), false);
  assert.equal(constantTimeEqual("short", "longer"), false);
});
