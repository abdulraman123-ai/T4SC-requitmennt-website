import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Team sign in",
  description: "Secure sign in for authorised T4SC team accounts.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const configured = Boolean(getSupabaseUrl() && getSupabasePublishableKey());
  return (
    <main className="page-shell auth-shell">
      <section className="auth-panel" data-reveal>
        <div className="auth-mark" aria-hidden="true">T4</div>
        <span className="section-kicker">T4SC · TEAM ACCESS</span>
        <h1>Welcome<br /><span className="gradient-text">back.</span></h1>
        <p className="auth-description">Sign in to the private T4SC workspace. This area is for authorised team accounts; applicants can continue to use the separate application portal.</p>
        <LoginForm configured={configured} />
        <p className="auth-footnote">Team access is provisioned by a T4SC administrator. Public account registration is disabled.</p>
        <div className="auth-links"><a href="/portal">Applicant portal ↗</a><a href="/privacy-policy">Privacy information ↗</a></div>
      </section>
    </main>
  );
}
