"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/lib/app-context";
import { CONFIGURED, sb } from "@/lib/supabase";
import { q } from "@/lib/data";
import { store } from "@/lib/utils";
import AuthModal from "./AuthModal";
import ShareModal from "./ShareModal";
import Setup from "./Setup";
import Nav, { TabBar } from "./Nav";
import Footer from "./Footer";

export default function Providers({ children }) {
  const router = useRouter();
  const [session, setSessionState] = useState(null); // {id,name,bio}
  const sessRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState("light");
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  /* ---- toast ---- */
  const toast = useCallback((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  /* ---- modal ---- */
  const openModal = useCallback((node) => setModal(node), []);
  const closeModal = useCallback(() => setModal(null), []);
  const authModal = useCallback((mode) => setModal(<AuthModal key={Date.now()} mode={mode || "in"} />), []);
  const openShare = useCallback((s) => {
    if (s.status !== "published") { toast("Publish the survey first to share it 🚀"); return; }
    setModal(<ShareModal key={s.id + Date.now()} s={s} />);
  }, [toast]);

  const copyText = useCallback(async (t) => {
    try { await navigator.clipboard.writeText(t); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    toast("Link copied! 🔗");
  }, [toast]);

  /* ---- theme (light / dark) ---- */
  useEffect(() => {
    const t = store.get("pulse_theme", "light");
    setTheme(t);
    document.documentElement.dataset.theme = t;
  }, []);
  const toggleDark = useCallback(() => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(t); store.set("pulse_theme", t);
    document.documentElement.dataset.theme = t;
  }, []);

  /* ---- auth ---- */
  const loadSession = useCallback(async (sess) => {
    if (!sess || !sess.user) { sessRef.current = null; setSessionState(null); return; }
    let name = "user", bio = "";
    try {
      const p = await q(sb.from("profiles").select("username,bio").eq("id", sess.user.id).maybeSingle());
      if (p) { name = p.username; bio = p.bio || ""; }
    } catch (e) {}
    const s = { id: sess.user.id, name, bio };
    sessRef.current = s;
    setSessionState(s);
  }, []);

  useEffect(() => {
    if (!CONFIGURED) { setReady(true); return; }
    let live = true;
    (async () => {
      const { data } = await sb.auth.getSession();
      await loadSession(data.session);
      if (live) setReady(true);
    })();
    const { data: sub } = sb.auth.onAuthStateChange((event, sess) => {
      // only react when the signed-in user actually changes (ignore token refreshes / tab focus)
      const newId = sess && sess.user ? sess.user.id : null;
      if (newId === ((sessRef.current && sessRef.current.id) || null)) return;
      setTimeout(() => loadSession(sess), 0); // defer: don't call supabase inside the callback
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, [loadSession]);

  const signOut = useCallback(async () => { await sb.auth.signOut(); toast("Signed out"); }, [toast]);
  const setBio = useCallback((bio) => {
    setSessionState((s) => { const n = s ? { ...s, bio } : s; sessRef.current = n; return n; });
  }, []);

  /* ---- legacy links: old "#/s/abc" shared URLs → "/s/abc" ---- */
  useEffect(() => {
    const h = window.location.hash;
    if (h && h.startsWith("#/")) router.replace(h.slice(1));
  }, [router]);

  const value = useMemo(() => ({
    session, ready, theme, toggleDark, toast, openModal, closeModal, authModal, openShare, copyText, signOut, setBio,
  }), [session, ready, theme, toggleDark, toast, openModal, closeModal, authModal, openShare, copyText, signOut, setBio]);

  return (
    <AppContext.Provider value={value}>
      <Nav />
      <main id="app">{CONFIGURED ? children : <Setup />}</main>
      <div id="modal-root">
        {modal && (
          <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="modal">{modal}</div>
          </div>
        )}
      </div>
      <TabBar />
      <Footer />
      {toasts.map((t) => <div className="toast" key={t.id}>{t.msg}</div>)}
    </AppContext.Provider>
  );
}
