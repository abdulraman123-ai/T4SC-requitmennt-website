"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/apply";
}

export function ApplicantAccessForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!acknowledged) {
      setError("Please read the privacy notice and community rules before continuing.");
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError("");
    setSent(false);
    try {
      const supabase = createClient();
      const destination = safeNext(searchParams.get("next"));
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", destination);
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectTo.toString(),
          shouldCreateUser: true,
        },
      });
      if (authError) throw authError;
      setSent(true);
    } catch {
      setError("We could not send the sign-in link. Check the email address and try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="form-field" htmlFor="applicant-email">
        <span>Email address <i>Required</i></span>
        <input
          id="applicant-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
        <span>I have read the <a href="/privacy-policy" target="_blank" rel="noreferrer">privacy notice</a> and <a href="/code-of-conduct" target="_blank" rel="noreferrer">community rules</a>.</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {sent && (
        <div className="auth-status" role="status">
          <MailCheck size={17}/>
          <span>Check your inbox. We sent a secure sign-in link. Open it to verify your email and return to T4SC. For safety, this confirmation does not reveal whether an account already existed.</span>
        </div>
      )}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "Sending link…" : "Send secure sign-in link"} <ArrowRight size={16}/>
      </button>
    </form>
  );
}
