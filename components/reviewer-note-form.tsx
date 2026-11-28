"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewerNoteForm({ reference }: { reference: string }) {
  const router = useRouter();
  const [note,setNote] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim() || note.length > 4000) {
      setError("Enter a note of up to 4,000 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "note", reference, note }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The reviewer note could not be saved.");
      setNote("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The reviewer note could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="content-card reviewer-note-form" onSubmit={submit}>
      <label className="form-field">
        <span>Internal reviewer note</span>
        <textarea value={note} onChange={(event)=>setNote(event.target.value)} maxLength={4000} rows={5} placeholder="Record concise, evidence-based observations for the authorised admissions team." required />
      </label>
      <p className="small-note">{note.length}/4,000 characters · Visible only to authorised reviewers.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" disabled={busy || !note.trim()}>{busy?"Saving…":"Save reviewer note"}</button>
    </form>
  );
}
