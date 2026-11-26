import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const configured = Boolean(getSupabaseUrl() && getSupabasePublishableKey());
  if (!configured) {
    return <main className="page-shell"><section className="page-hero"><span className="eyebrow">T4SC · REVIEWER WORKSPACE</span><h1>Secure access<br/><span className="gradient-text">is being prepared.</span></h1><p>The private team sign-in will become available after the T4SC database project and its credentials are connected. Applicant information is not exposed on this page.</p><div className="page-actions"><Link className="button" href="/login">Team sign in ↗</Link><Link className="button button-quiet" href="/">Back to T4SC</Link></div></section></main>;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login?next=%2Fadmin");
  return <main className="page-shell"><section className="page-hero"><span className="eyebrow">PRIVATE REVIEWER WORKSPACE</span><h1>Account<br/><span className="gradient-text">verified.</span></h1><p>You are signed in as <strong>{data.user.email}</strong>. Authentication confirms your account, but it does not automatically grant reviewer permissions.</p></section><section className="notice-panel"><b>Reviewer permissions are not enabled yet</b><p>No applicant records, assessment answers or reviewer notes are shown here. A T4SC administrator must assign the reviewer role and activate the corresponding row-level security policies before this workspace can display applicant information.</p><div className="admin-account"><span>Signed in: {data.user.email}</span><SignOutButton/></div></section></main>;
}
