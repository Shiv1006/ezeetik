"use client";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { sb } from "@/lib/supabase";
import { q } from "@/lib/data";

export default function AuthModal({ mode: initial = "in" }) {
  const { closeModal, toast } = useApp();
  const [mode, setMode] = useState(initial);
  const [sentTo, setSentTo] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const up = mode === "up";

  async function doAuth() {
    const em = email.trim();
    if (!em || !pw) return setErr("Please enter your email and password.");
    setBusy(true); setErr("");
    try {
      if (up) {
        const u = name.trim();
        if (!/^[A-Za-z0-9_]{3,30}$/.test(u)) throw new Error("Username must be 3–30 letters, numbers or underscores.");
        if (pw.length < 6) throw new Error("Password must be at least 6 characters.");
        const taken = await q(sb.from("profiles").select("id").ilike("username", u.replace(/[\\_%]/g, "\\$&")).limit(1));
        if (taken.length) throw new Error("That username is already taken.");
        const { data, error } = await sb.auth.signUp({ email: em, password: pw, options: { data: { username: u } } });
        if (error) throw error;
        if (!data.session) { setSentTo(em); setBusy(false); return; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
      }
      closeModal(); toast("Welcome 👋");
    } catch (e) {
      setErr(e.message || "Something went wrong.");
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <>
        <h3>Check your inbox ✉️</h3>
        <p className="muted" style={{ margin: ".8rem 0 1.4rem" }}>We sent a confirmation link to <b>{sentTo}</b>. Click it, then sign in.</p>
        <div style={{ textAlign: "right" }}>
          <button className="btn btn-k" onClick={() => { setSentTo(null); setMode("in"); }}>Go to sign in</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h3>{up ? "Create your account" : "Welcome back"} 👋</h3>
      <div className="auth-tabs">
        <button className={up ? "" : "on"} onClick={() => { setMode("in"); setErr(""); }}>Sign in</button>
        <button className={up ? "on" : ""} onClick={() => { setMode("up"); setErr(""); }}>Sign up</button>
      </div>
      {up && (
        <div style={{ marginBottom: ".9rem" }}>
          <label>Username</label>
          <input autoFocus maxLength={30} placeholder="e.g. rahul_k" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div style={{ marginBottom: ".9rem" }}>
        <label>Email</label>
        <input autoFocus={!up} type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label>Password</label>
        <input type="password" placeholder="At least 6 characters" autoComplete={up ? "new-password" : "current-password"} value={pw}
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doAuth(); }} />
      </div>
      <div className="err-box">{err}</div>
      <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: ".8rem" }}>
        <button className="btn btn-g" onClick={closeModal}>Cancel</button>
        <button className="btn btn-p" disabled={busy} onClick={doAuth}>{up ? "Create account" : "Sign in"}</button>
      </div>
    </>
  );
}
