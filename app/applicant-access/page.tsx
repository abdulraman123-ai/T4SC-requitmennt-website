import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ApplicantAccessForm } from "@/components/applicant-access-form";

export const metadata: Metadata = {
  title: "Applicant account access",
  description: "Create or access your secure T4SC applicant account.",
  robots: { index: false, follow: false },
};

export default function ApplicantAccessPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-panel" data-reveal>
        <div className="auth-mark" aria-hidden="true">T4</div>
        <span className="section-kicker">T4SC · APPLICANT ACCESS</span>
        <h1>Your account.<br/><span className="gradient-text">Your application.</span></h1>
        <p className="auth-description">Create an applicant account with your email and a password, or sign in to an existing account. Your account is saved directly to T4SC and you can continue immediately — no email sign-in link is sent.</p>
        <Suspense fallback={<p className="small-note">Preparing applicant access…</p>}>
          <ApplicantAccessForm />
        </Suspense>
        <div className="auth-links">
          <Link href="/privacy-policy">Privacy notice ↗</Link>
          <Link href="/code-of-conduct">Community rules ↗</Link>
        </div>
        <p className="auth-footnote">Keep your password private. T4SC staff will never ask you to share it.</p>
      </section>
    </main>
  );
}
