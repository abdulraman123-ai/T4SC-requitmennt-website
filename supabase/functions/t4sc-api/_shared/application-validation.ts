export const APPLICATION_SCHEMA_V1 = "t4sc-application-v1" as const;
export const DECLARATION_SCHEMA_V1 = "t4sc-declarations-v1" as const;
export const PRIVACY_NOTICE_V1 = "t4sc-privacy-v1" as const;

export const APPLICATION_DEPARTMENTS = [
  "AI & Machine Learning",
  "Game Development",
  "Full Stack Development & System Architecture",
  "Cybersecurity & Systems Security",
] as const;

export const APPLICATION_EXPERIENCE_ROUTES = [
  "Beginner",
  "Developing",
  "Experienced",
] as const;

export const APPLICATION_AVAILABILITY_OPTIONS = [
  "Less than 2 hours",
  "2–4 hours",
  "5–7 hours",
  "8 or more hours",
  "Not sure yet",
] as const;

export interface ApplicationV1Input {
  applicationSchemaVersion: typeof APPLICATION_SCHEMA_V1;
  preferredName: string;
  email: string;
  country: string;
  region?: string;
  primaryDepartment: string;
  alternativeDepartment: string;
  experienceLevel: string;
  experienceDescription?: string;
  workSampleUrl?: string;
  motivation: string;
  learningGoals: string;
  weeklyAvailability: string;
  accessibilityNeeds?: string;
  rulesAccepted: boolean;
  honestyAccepted: boolean;
  privacyAccepted: boolean;
}

export interface NormalizedApplicationV1 {
  preferredName: string;
  email: string;
  country: string;
  region: string | null;
  primaryDepartment: (typeof APPLICATION_DEPARTMENTS)[number];
  alternativeDepartment: (typeof APPLICATION_DEPARTMENTS)[number];
  experienceLevel: (typeof APPLICATION_EXPERIENCE_ROUTES)[number];
  experienceDescription: string;
  workSampleUrl: string | null;
  motivation: string;
  learningGoals: string;
  weeklyAvailability: (typeof APPLICATION_AVAILABILITY_OPTIONS)[number];
  accessibilityNeeds: string | null;
  applicationSchemaVersion: typeof APPLICATION_SCHEMA_V1;
  declarationVersion: typeof DECLARATION_SCHEMA_V1;
  privacyNoticeVersion: typeof PRIVACY_NOTICE_V1;
}

export type ApplicationValidationResult =
  | { ok: true; value: NormalizedApplicationV1 }
  | { ok: false; error: string };

export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function isText(value: unknown): value is string {
  return typeof value === "string";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateApplicationV1(body: unknown): ApplicationValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid application request." };
  }
  const input = body as Record<string, unknown>;
  if (input.applicationSchemaVersion !== APPLICATION_SCHEMA_V1) {
    return { ok: false, error: "Unsupported application form version." };
  }

  const required = [
    "preferredName", "email", "country", "primaryDepartment",
    "alternativeDepartment", "experienceLevel", "motivation",
    "learningGoals", "weeklyAvailability",
  ];
  for (const field of required) {
    if (!isText(input[field]) || !input[field].trim()) {
      return { ok: false, error: "Please complete all required application fields." };
    }
  }

  const preferredName = (input.preferredName as string).trim();
  const email = (input.email as string).trim().toLowerCase();
  const country = (input.country as string).trim();
  const primaryDepartment = input.primaryDepartment as string;
  const alternativeDepartment = input.alternativeDepartment as string;
  const experienceLevel = input.experienceLevel as string;
  const motivation = (input.motivation as string).trim();
  const learningGoals = (input.learningGoals as string).trim();
  const weeklyAvailability = input.weeklyAvailability as string;
  const region = isText(input.region) ? input.region.trim() : "";
  const experienceDescription = isText(input.experienceDescription) ? input.experienceDescription.trim() : "";
  const workSampleUrl = isText(input.workSampleUrl) ? input.workSampleUrl.trim() : "";
  const accessibilityNeeds = isText(input.accessibilityNeeds) ? input.accessibilityNeeds.trim() : "";

  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (!(APPLICATION_DEPARTMENTS as readonly string[]).includes(primaryDepartment) ||
      !(APPLICATION_DEPARTMENTS as readonly string[]).includes(alternativeDepartment) ||
      primaryDepartment === alternativeDepartment) {
    return { ok: false, error: "Choose one primary and a different alternative department." };
  }
  if (!(APPLICATION_EXPERIENCE_ROUTES as readonly string[]).includes(experienceLevel)) {
    return { ok: false, error: "Choose Beginner, Developing or Experienced for your assessment route." };
  }

  const motivationWords = countWords(motivation);
  const goalWords = countWords(learningGoals);
  if (motivationWords < 50 || motivationWords > 150) {
    return { ok: false, error: "Your motivation response must be 50–150 words." };
  }
  if (goalWords < 30 || goalWords > 120) {
    return { ok: false, error: "Your learning/goals response must be 30–120 words." };
  }
  if (countWords(experienceDescription) > 150) {
    return { ok: false, error: "Your optional experience description must be 150 words or fewer." };
  }
  if (accessibilityNeeds.length > 500) {
    return { ok: false, error: "Your support request must be 500 characters or fewer." };
  }

  if (workSampleUrl) {
    if (workSampleUrl.length > 2048) return { ok: false, error: "The work-sample link is too long." };
    try {
      const sample = new URL(workSampleUrl);
      if (sample.protocol !== "https:") return { ok: false, error: "A work-sample link must use HTTPS." };
    } catch {
      return { ok: false, error: "Enter a valid HTTPS work-sample link." };
    }
  }

  if (!(APPLICATION_AVAILABILITY_OPTIONS as readonly string[]).includes(weeklyAvailability)) {
    return { ok: false, error: "Choose one of the listed weekly availability ranges." };
  }
  if (input.rulesAccepted !== true || input.honestyAccepted !== true || input.privacyAccepted !== true) {
    return { ok: false, error: "Please accept each required declaration before submitting." };
  }

  return {
    ok: true,
    value: {
      preferredName,
      email,
      country,
      region: region || null,
      primaryDepartment: primaryDepartment as NormalizedApplicationV1["primaryDepartment"],
      alternativeDepartment: alternativeDepartment as NormalizedApplicationV1["alternativeDepartment"],
      experienceLevel: experienceLevel as NormalizedApplicationV1["experienceLevel"],
      experienceDescription,
      workSampleUrl: workSampleUrl || null,
      motivation,
      learningGoals,
      weeklyAvailability: weeklyAvailability as NormalizedApplicationV1["weeklyAvailability"],
      accessibilityNeeds: accessibilityNeeds || null,
      applicationSchemaVersion: APPLICATION_SCHEMA_V1,
      declarationVersion: DECLARATION_SCHEMA_V1,
      privacyNoticeVersion: PRIVACY_NOTICE_V1,
    },
  };
}
