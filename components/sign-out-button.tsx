"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login"); router.refresh();
    } catch {
      setError("Could not sign out. Please try again."); setBusy(false);
    }
  }
  return <div><button type="button" className="button button-quiet button-small" onClick={signOut} disabled={busy}><LogOut size={14}/> {busy?"Signing out…":"Sign out"}</button>{error&&<p className="form-error" role="alert">{error}</p>}</div>;
}
