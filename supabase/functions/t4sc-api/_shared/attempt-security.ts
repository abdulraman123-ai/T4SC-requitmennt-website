export const MAX_ATTEMPT_RESPONSE_BYTES = 200_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function hashAttemptToken(token: string): Promise<string> {
  if (!isValidUuid(token)) throw new TypeError("Invalid assessment attempt token.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isResponsePayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_ATTEMPT_RESPONSE_BYTES;
  } catch {
    return false;
  }
}

export function isResponseVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function isStaleResponseVersion(currentVersion: number, incomingVersion: number): boolean {
  return incomingVersion <= currentVersion;
}
