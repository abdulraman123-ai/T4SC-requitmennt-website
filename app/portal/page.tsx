"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

const labels: Record<string, string> = {
  submitted: "Submitted",
  needs_review: "Needs review",
  general_screening: "General screening",
  department_assessment: "Department assessment",
  practical_task: "Practical task",
  clarification: "Clarification",
  under_review: "Under review",
  admitted: "Admitted",
  conditional_foundation: "Conditional / Foundation",
  waitlisted: "Waitlisted",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
  onboarding: "Onboarding",
  active_member: "Active member",
};
const communityEligibleStatuses = ["admitted", "onboarding", "active_member"];

export default function Portal() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setStatus(null);
    setInviteUrl("");
    setInviteMessage("");

    try {
      const response = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to find your application.");

      setStatus(data.application);
      if (communityEligibleStatuses.includes(data.application.status)) {
        try {
          const accessResponse = await fetch("/api/community-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference, email }),
            cache: "no-store",
          });
          const accessData = await accessResponse.json();
          if (accessResponse.ok && typeof accessData.inviteUrl === "string") {
            setInviteUrl(accessData.inviteUrl);
          } else {
            setInviteMessage(accessData.error || "Your admission is recorded, but the invitation is not available yet. Please contact T4SC admissions.");
          }
        } catch {
          setInviteMessage("Your admission is recorded, but we could not load the invitation. Please contact T4SC admissions.");
        }
      } else {
        setInviteMessage("Telegram access is shared privately after successful admission and completion of the required screening and assessment stages.");
      }
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Status lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero" data-reveal>
        <span className="eyebrow">PRIVATE APPLICANT PORTAL</span>
        <h1>Your application.<br /><span className="gradient-text">Your progress.</span></h1>
        <p>Use the application reference and the email address you applied with. This lookup only shows your own application status — it does not expose answers, scores or reviewer notes.</p>
      </section>

      <form className="portal-lookup" onSubmit={check}>
        <label className="form-field">
          <span>Application reference <i>Required</i></span>
          <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="T4SC-XXXXXXXX" required />
        </label>
        <label className="form-field">
          <span>Application email <i>Required</i></span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="The email used in your application" required />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Checking…" : "Check status"} <Search size={15} />
        </button>
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}

      {status && (
        <section className="status-result" data-reveal>
          <span className="section-kicker">APPLICATION STATUS</span>
          <h2>{labels[status.status] ?? status.status}</h2>
          <p>Hello {status.preferred_name || "applicant"}, your application reference is <b>{status.reference}</b>.</p>
          <div className="status-date">Last updated: {new Date(status.updated_at || status.created_at).toLocaleString()}</div>
          <p className="small-note">This status is private. The admissions team will communicate decisions through the contact route supplied in your application.</p>

          <div className="community-access-card">
            <span className="section-kicker">/ JOIN T4SC COMMUNITY</span>
            {inviteUrl ? (
              <>
                <h3>Your community invitation is ready.</h3>
                <p>Your application has been marked as admitted. Use this private invitation to join the T4SC Telegram community. Please do not share it publicly.</p>
                <a className="button" href={inviteUrl} target="_blank" rel="noopener noreferrer">Join T4SC on Telegram <ArrowUpRight size={15} /></a>
              </>
            ) : (
              <>
                <h3>Community access follows admission.</h3>
                <p>{inviteMessage || "Successful applicants receive their Telegram invitation privately after the screening and assessment process."}</p>
              </>
            )}
          </div>
        </section>
      )}

      <div className="notice-panel" style={{ marginTop: 35 }}>
        <b>Not applied yet?</b>
        <p>Read the admissions process before beginning your application.</p>
        <Link className="text-link" href="/admissions">Admissions information ↗</Link>
      </div>
    </main>
  );
}
