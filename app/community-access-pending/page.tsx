import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community access setup",
  robots: { index: false, follow: false },
};

export default function CommunityAccessPendingPage() {
  return (
    <main className="page-shell">
      <section className="page-hero" data-reveal>
        <span className="eyebrow">T4SC · COMMUNITY ONBOARDING</span>
        <h1>Your offer is accepted.<br /><span className="gradient-text">Community access is being prepared.</span></h1>
        <p>The private Telegram invitation is not active yet. T4SC is completing the join-request approval setup so that every request can be checked by an administrator.</p>
        <p className="small-note">Your accepted offer remains recorded. This does not change your admission status.</p>
        <div className="page-actions">
          <Link className="button" href="/portal">Return to applicant dashboard</Link>
        </div>
      </section>
    </main>
  );
}
