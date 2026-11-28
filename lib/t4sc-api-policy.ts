export type T4SCApiAction =
  | "application_submit"
  | "status_lookup"
  | "assessment_submit"
  | "attempt_start"
  | "attempt_read"
  | "attempt_save"
  | "offer_respond"
  | "community_access";

export interface RuntimeEnvironment {
  T4SC_PREVIEW_READ_ONLY?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
}

const MUTATING_ACTIONS = new Set<T4SCApiAction>([
  "application_submit",
  "assessment_submit",
  "attempt_start",
  "attempt_save",
  "offer_respond",
]);

export function isT4SCMutationAction(action: T4SCApiAction): boolean {
  return MUTATING_ACTIONS.has(action);
}

export function isT4SCReadOnlyRuntime(environment: RuntimeEnvironment): boolean {
  return (
    environment.T4SC_PREVIEW_READ_ONLY === "true" ||
    environment.VERCEL_ENV === "preview" ||
    environment.NODE_ENV !== "production"
  );
}

export function shouldBlockT4SCAction(action: T4SCApiAction, environment: RuntimeEnvironment): boolean {
  return isT4SCMutationAction(action) && isT4SCReadOnlyRuntime(environment);
}
