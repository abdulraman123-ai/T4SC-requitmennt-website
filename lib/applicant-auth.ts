import { createClient } from "@/lib/supabase/server";

export interface ApplicantSessionContext {
  userId: string;
  email: string;
  accessToken: string;
}

// Authenticates the signed-in T4SC account. Password-only signup does not verify mailbox ownership.
// Never use this session check to auto-link older applications based only on an email-string match.
export async function getApplicantSessionContext(): Promise<ApplicantSessionContext | null> {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();

    const user = userData.user;
    const accessToken = sessionData.session?.access_token;
    if (userError || !user?.id || !user.email || !user.email_confirmed_at || !accessToken) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email.trim().toLowerCase(),
      accessToken,
    };
  } catch {
    return null;
  }
}
