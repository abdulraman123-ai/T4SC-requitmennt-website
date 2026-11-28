"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = [
  ["needs_review","Needs review"],
  ["general_screening","General screening"],
  ["department_assessment","Department assessment"],
  ["practical_task","Practical task"],
  ["clarification","Clarification"],
  ["under_review","Under review"],
];

export function ReviewerStatusForm({ reference, currentStatus }: { reference: string; currentStatus: string }) {
  const router = useRouter();
  const [newStatus,setNewStatus] = useState(currentStatus);
  const [reason,setReason] = useState("");
  const [error,setError] = useState("");
  const [saved,setSaved] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim() || reason.trim().length > 1000) {
      setError("Enter a reason of up to 1,000 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/reviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", reference, newStatus, reason }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The review status could not be updated.");
      setReason("");
      setSaved("Status updated and recorded in the audit history.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The review status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="content-card reviewer-note-form" onSubmit={submit}>
      <label className="form-field">
        <span>Move to a review stage</span>
        <select value={newStatus} onChange={(event)=>setNewStatus(event.target.value)}>
          {statuses.map(([value,label])=><option value={value} key={value}>{label}</option>)}
        </select>
        <small>Final outcomes and offers cannot be set here. Those remain disabled until the approved admissions process is ready.</small>
      </label>
      <label className="form-field">
        <span>Reason for this update</span>
        <textarea rows={3} maxLength={1000} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Record the evidence or next step that justifies this review-stage change." required />
      </label>
      <p className="small-note">{reason.length}/1,000 characters · Every change is recorded in the private history.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="small-note" role="status">{saved}</p>}
      <button className="button" disabled={busy || !reason.trim()}>{busy?"Saving…":"Save review status"}</button>
    </form>
  );
}
