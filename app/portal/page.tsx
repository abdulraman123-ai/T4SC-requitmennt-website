"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [admissions, setAdmissions] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadVerifiedEmail() {
      try {
        const supabase = createClient();
        const { data, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError || !data.user?.email_confirmed_at || !data.user.email) {
          router.replace("/applicant-access?next=%2Fportal");
          return;
        }
        const normalized = data.user.email.trim().toLowerCase();
        setVerifiedEmail(normalized);
        setEmail(normalized);
      } catch {
        if (active) router.replace("/applicant-access?next=%2Fportal");
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    void loadVerifiedEmail();
    return () => { active = false; };
  }, [router]);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!verifiedEmail) {
      setError("Sign in with your verified applicant email to view your status.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus(null);
    setAdmissions(null);
    setOffer(null);
    setOfferError("");
    setInviteUrl("");
    setInviteMessage("");

    try {
      const response = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email: verifiedEmail }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to find your application.");

      setStatus(data.application);
      setAdmissions(data.admissions ?? null);
      setOffer(data.offer ?? null);
      if (communityEligibleStatuses.includes(data.application.status)) {
        try {
          const accessResponse = await fetch("/api/community-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference, email: verifiedEmail }),
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

  async function respondToOffer(response: "accept" | "decline") {
    if (!status || !offer || offer.status !== "offered") return;
    setOfferBusy(true);
    setOfferError("");
    try {
      const responseResult = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: status.reference, offerId: offer.id, response }),
        cache: "no-store",
      });
      const data = await responseResult.json();
      if (!responseResult.ok) throw new Error(data.error || "Your offer response could not be confirmed.");
      setOffer(data.offer ?? null);
      setAdmissions(data.admissions ?? null);
      if (data.applicationStatus) {
        setStatus((current: any) => current ? { ...current, status: data.applicationStatus, updated_at: new Date().toISOString() } : current);
      }
      if (response === "accept" && data.offer?.status === "accepted") {
        try {
          const accessResponse = await fetch("/api/community-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: status.reference, email: verifiedEmail }),
            cache: "no-store",
          });
          const accessData = await accessResponse.json();
          if (accessResponse.ok && typeof accessData.inviteUrl === "string") setInviteUrl(accessData.inviteUrl);
          else setInviteMessage(accessData.error || "Your offer is accepted. The community invitation is not available yet.");
        } catch {
          setInviteMessage("Your offer is accepted. We could not load the community invitation; contact T4SC admissions.");
        }
      }
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : "Your offer response could not be confirmed.");
    } finally {
      setOfferBusy(false);
    }
  }

  if (authLoading) return <main className="page-shell"><p className="small-note">Verifying your applicant account…</p></main>;

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
          <input type="email" value={verifiedEmail} disabled readOnly required />
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
          {admissions && (
            <div className="notice-panel" style={{ marginTop: 18 }}>
              <b>Admissions progress: {String(admissions.status).replaceAll("_", " ")}</b>
              {admissions.activeDepartment && <p>Current department: {admissions.activeDepartment}</p>}
              <p className="small-note">This status is generated from your private admissions record.</p>
            </div>
          )}
          {offer && (
            <div className="community-access-card" style={{ marginTop: 18 }}>
              <span className="section-kicker">FORMAL ADMISSION OFFER</span>
              <h3>{offer.status === "offered" ? "Your offer is ready" : offer.status === "accepted" ? "Offer accepted" : offer.status === "declined" ? "Offer declined" : "Offer expired"}</h3>
              <p>Department: <b>{offer.department}</b></p>
              <p>Issued: {new Date(offer.issuedAt).toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
              <p>Response deadline: <b>{new Date(offer.expiresAt).toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</b></p>
              {offer.status === "offered" ? (
                <>
                  <p>Your response must be recorded before the exact deadline above. The server timestamp, not the browser clock, determines whether your response is on time.</p>
                  <div className="page-actions">
                    <button type="button" className="button" disabled={offerBusy} onClick={() => void respondToOffer("accept")}>{offerBusy ? "Saving…" : "Accept offer"}</button>
                    <button type="button" className="button button-quiet" disabled={offerBusy} onClick={() => void respondToOffer("decline")}>Decline offer</button>
                  </div>
                  {offerError && <p className="form-error" role="alert">{offerError}</p>}
                </>
              ) : (
                <p className="small-note">The server has recorded this offer outcome. The response is locked and cannot be changed from this page.</p>
              )}
            </div>
          )}
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
