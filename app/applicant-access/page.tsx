import Link from "next/link";
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
        <p className="auth-description">Use an email address you control. We will send a one-time sign-in link to verify the address and open your private applicant workspace. No password is required.</p>
        <ApplicantAccessForm />
        <div className="auth-links">
          <Link href="/privacy-policy">Privacy notice ↗</Link>
          <Link href="/code-of-conduct">Community rules ↗</Link>
        </div>
        <p className="auth-footnote">Never share a sign-in link or one-time code with anyone, including someone claiming to be T4SC support.</p>
      </section>
    </main>
  );
}
