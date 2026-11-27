import { createClient } from "@/lib/supabase/server";

export interface VerifiedApplicantContext {
  userId: string;
  email: string;
  accessToken: string;
}

export async function getVerifiedApplicantContext(): Promise<VerifiedApplicantContext | null> {
  try {
    const supabase = await createClient();
    const [{ data: userData, error: userError }, { data: sessionData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

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
