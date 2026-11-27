import assert from "node:assert/strict";
import test from "node:test";
import {
  APPLICATION_SCHEMA_V1,
  countWords,
  validateApplicationV1,
} from "../supabase/functions/t4sc-api/_shared/application-validation.ts";

const words = (count: number) => Array.from({ length: count }, (_, index) => "word" + index).join(" ");
function valid(overrides: Record<string, unknown> = {}) {
  return {
    applicationSchemaVersion: APPLICATION_SCHEMA_V1,
    preferredName: "  T4SC Applicant  ",
    email: " APPLICANT@example.com ",
    country: " Türkiye ",
    region: "  ",
    primaryDepartment: "AI & Machine Learning",
    alternativeDepartment: "Game Development",
    experienceLevel: "Beginner",
    experienceDescription: "",
    workSampleUrl: "",
    motivation: words(50),
    learningGoals: words(30),
    weeklyAvailability: "2–4 hours",
    accessibilityNeeds: "",
    rulesAccepted: true,
    honestyAccepted: true,
    privacyAccepted: true,
    ...overrides,
  };
}

test("accepts and normalizes a complete application v1 payload", () => {
  const result = validateApplicationV1(valid());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.preferredName, "T4SC Applicant");
  assert.equal(result.value.email, "applicant@example.com");
  assert.equal(result.value.country, "Türkiye");
  assert.equal(result.value.region, null);
  assert.equal(result.value.declarationVersion, "t4sc-declarations-v1");
  assert.equal(result.value.privacyNoticeVersion, "t4sc-privacy-v1");
});

test("requires the supported schema version", () => {
  assert.equal(validateApplicationV1({ ...valid(), applicationSchemaVersion: "v0" }).ok, false);
});

test("requires each approved required field", () => {
  const result = validateApplicationV1(valid({ alternativeDepartment: "" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /required application fields/);
});

test("normalizes email case and rejects malformed addresses", () => {
  assert.equal(validateApplicationV1(valid({ email: "abc@" })).ok, false);
  const result = validateApplicationV1(valid());
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.email, "applicant@example.com");
});

test("requires distinct primary and alternative departments", () => {
  const result = validateApplicationV1(valid({ alternativeDepartment: "AI & Machine Learning" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /different alternative department/);
});

test("accepts only Beginner, Developing and Experienced routes", () => {
  assert.equal(validateApplicationV1(valid({ experienceLevel: "Experienced" })).ok, true);
  assert.equal(validateApplicationV1(valid({ experienceLevel: "Advanced" })).ok, false);
});

test("enforces motivation word limits at both boundaries", () => {
  assert.equal(validateApplicationV1(valid({ motivation: words(49) })).ok, false);
  assert.equal(validateApplicationV1(valid({ motivation: words(50) })).ok, true);
  assert.equal(validateApplicationV1(valid({ motivation: words(150) })).ok, true);
  assert.equal(validateApplicationV1(valid({ motivation: words(151) })).ok, false);
});

test("enforces learning-goals word limits at both boundaries", () => {
  assert.equal(validateApplicationV1(valid({ learningGoals: words(29) })).ok, false);
  assert.equal(validateApplicationV1(valid({ learningGoals: words(30) })).ok, true);
  assert.equal(validateApplicationV1(valid({ learningGoals: words(120) })).ok, true);
  assert.equal(validateApplicationV1(valid({ learningGoals: words(121) })).ok, false);
});

test("limits optional prior experience to 150 words", () => {
  assert.equal(validateApplicationV1(valid({ experienceDescription: words(150) })).ok, true);
  assert.equal(validateApplicationV1(valid({ experienceDescription: words(151) })).ok, false);
});

test("accepts one HTTPS work sample and rejects HTTP or malformed links", () => {
  assert.equal(validateApplicationV1(valid({ workSampleUrl: "https://example.com/project" })).ok, true);
  assert.equal(validateApplicationV1(valid({ workSampleUrl: "http://example.com/project" })).ok, false);
  assert.equal(validateApplicationV1(valid({ workSampleUrl: "not a url" })).ok, false);
});

test("limits work-sample URL to 2048 characters", () => {
  assert.equal(validateApplicationV1(valid({ workSampleUrl: "https://a.example/" + "x".repeat(2035) })).ok, false);
});

test("accepts only the five approved availability options", () => {
  assert.equal(validateApplicationV1(valid({ weeklyAvailability: "Not sure yet" })).ok, true);
  assert.equal(validateApplicationV1(valid({ weeklyAvailability: "More than 10 hours" })).ok, false);
});

test("requires all three unticked declarations to be explicitly true", () => {
  assert.equal(validateApplicationV1(valid({ rulesAccepted: false })).ok, false);
  assert.equal(validateApplicationV1(valid({ honestyAccepted: false })).ok, false);
  assert.equal(validateApplicationV1(valid({ privacyAccepted: false })).ok, false);
});

test("limits support requests to 500 characters", () => {
  assert.equal(validateApplicationV1(valid({ accessibilityNeeds: "x".repeat(500) })).ok, true);
  assert.equal(validateApplicationV1(valid({ accessibilityNeeds: "x".repeat(501) })).ok, false);
});

test("counts words separated by multiple whitespace characters", () => {
  assert.equal(countWords("  one\n two   three "), 3);
});
