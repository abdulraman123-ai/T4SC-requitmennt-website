"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password
      });
      if (authError) {
        setError("We could not verify those sign-in details. Check them and try again.");
        return;
      }
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/admin";
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {!configured && <div className="auth-status" role="status"><LockKeyhole size={15}/><span>Secure sign in is not active yet because the T4SC Supabase project has not been connected. The applicant portal remains separate.</span></div>}
      <label className="form-field" htmlFor="team-email"><span>Team email <i>Required</i></span><input id="team-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="name@t4sc.org" required/></label>
      <div className="form-field"><label htmlFor="team-password"><span>Password <i>Required</i></span></label><div className="auth-password"><input id="team-password" type={showPassword?"text":"password"} autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="Enter your password" required/><button className="button button-quiet button-small" type="button" aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword((value)=>!value)}>{showPassword?<EyeOff size={14}/>:<Eye size={14}/>} {showPassword?"Hide":"Show"}</button></div></div>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={!configured||busy}>{busy?"Signing in…":"Sign in securely"} <ArrowRight size={16}/></button>
    </form>
  );
}
