export interface ApplicationOwnerRecord {
  auth_user_id?: string | null;
}

export interface ApplicantIdentity {
  id: string;
  email?: string | null;
}

/**
 * An account owns an application only when its immutable auth_user_id matches.
 * Matching email strings are not proof of inbox ownership, so legacy unlinked
 * applications must never be auto-claimed by a password-only signup.
 */
export function isApplicationOwnedByUser(
  application: ApplicationOwnerRecord,
  user: ApplicantIdentity,
  requestedEmail: string,
): boolean {
  const normalizedEmail = requestedEmail.trim().toLowerCase();
  const accountEmail = user.email?.trim().toLowerCase();
  return Boolean(
    application.auth_user_id &&
    application.auth_user_id === user.id &&
    accountEmail &&
    accountEmail === normalizedEmail,
  );
}
