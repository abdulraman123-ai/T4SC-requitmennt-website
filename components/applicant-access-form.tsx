"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AccessMode = "signup" | "signin";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/apply";
}

export function ApplicantAccessForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<AccessMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const callbackError = searchParams.get("error") === "callback";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 10 || password.length > 128) {
      setError("Your password must be at least 10 characters long.");
      return;
    }
    if (mode === "signup") {
      if (!acknowledged) {
        setError("Please read and accept the privacy notice and community rules.");
        return;
      }
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();

      if (mode === "signup") {
        const response = await fetch("/api/applicant-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof result.error === "string" ? result.error : "We could not create your account. Please try again.");
        }
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (authError) {
        if (mode === "signup") {
          setMode("signin");
          throw new Error("Your account was created, but automatic sign-in did not complete. Sign in with the same email and password.");
        }
        throw new Error("We could not sign you in. Check your email and password and try again.");
      }

      router.replace(safeNext(searchParams.get("next")));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Account access is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="page-actions" role="group" aria-label="Applicant account action">
        <button type="button" className={`button button-small ${mode === "signup" ? "" : "button-quiet"}`} aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>
          Create account
        </button>
        <button type="button" className={`button button-small ${mode === "signin" ? "" : "button-quiet"}`} aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }}>
          Sign in
        </button>
      </div>

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

      <div className="form-field">
        <label htmlFor="applicant-password"><span>Password <i>Required</i></span></label>
        <div className="auth-password">
          <input
            id="applicant-password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "signup" ? "Create a password (10+ characters)" : "Enter your password"}
            minLength={10}
            maxLength={128}
            required
          />
          <button className="button button-quiet button-small" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>} {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {mode === "signup" && (
        <>
          <div className="form-field">
            <label htmlFor="applicant-confirm-password"><span>Confirm password <i>Required</i></span></label>
            <input
              id="applicant-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
              minLength={10}
              maxLength={128}
              required
            />
          </div>
          <label className="check-row">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>I have read the <a href="/privacy-policy" target="_blank" rel="noreferrer">privacy notice</a> and <a href="/code-of-conduct" target="_blank" rel="noreferrer">community rules</a>.</span>
          </label>
          <p className="small-note">Your account is saved to T4SC immediately. We do not send a sign-up or verification link. Use an email address you can access because T4SC may use it to contact you about your application.</p>
        </>
      )}

      {callbackError && <p className="form-error" role="alert">We could not complete that sign-in session. Enter your account details below.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>
        {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : (mode === "signup" ? "Create account and continue" : "Sign in to T4SC")}
        {busy ? <LockKeyhole size={15}/> : <ArrowRight size={16}/>}
      </button>
    </form>
  );
}
