"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(mode === "sign-up" ? "Check your email to confirm your account." : "Signed in successfully.");
      if (mode === "sign-in") setIsOpen(false);
    }
    setIsSubmitting(false);
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    setMessage("Signed out.");
  }

  async function signInWithGoogle() {
    setMessage("");
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMessage(error.message);
  }

  if (user) {
    return <button className="profile-button" onClick={signOut} aria-label="Sign out">{(user.email?.slice(0, 2) ?? "ME").toUpperCase()}</button>;
  }

  return (
    <>
      <button className="profile-button" onClick={() => setIsOpen((value) => !value)} aria-label="Open account">AM</button>
      {isOpen && (
        <div className="auth-panel" role="dialog" aria-label="Account authentication">
          <div className="auth-tabs">
            <button className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>Sign in</button>
            <button className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>Sign up</button>
          </div>
          <button className="google-submit" type="button" onClick={signInWithGoogle}>Continue with Google</button>
          <div className="auth-divider"><span>or use email</span></div>
          <form onSubmit={submit}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} /></label>
            <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}</button>
          </form>
          {message && <p className="auth-message">{message}</p>}
        </div>
      )}
    </>
  );
}
