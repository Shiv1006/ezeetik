"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { useSurveyTheme } from "@/lib/hooks";
import { CATEGORIES, MAX_REGULAR_Q, MIN_REGULAR_Q, QUESTION_TYPES, THEMES, newQuestion } from "@/lib/constants";
import { SURVEY_SEL, insertSurvey, q, reg, validateSurveyQuestions } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { uid } from "@/lib/utils";
import { Fail, Loading, NeedAuth } from "@/components/Ui";
import { ArrowDown, ArrowUp, Copy, Eye, GripVertical, LockKeyhole, Puzzle, Trash2 } from "lucide-react";
import { Icon } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default function Builder() {
  const { id } = useParams();
  const router = useRouter();
  const { session, ready, toast, openShare } = useApp();

  const [s, setS] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | err
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState("");
  const ref = useRef(null);     // always the latest survey (for autosave)
  const saveT = useRef(null);

  useSurveyTheme(s && s.theme);

  /* ---------- load ---------- */
  useEffect(() => {
    if (!ready || !session) return;
    let live = true;
    setStatus("loading");
    (async () => {
      try {
        const row = await q(sb.from("surveys").select(SURVEY_SEL).eq("id", id).maybeSingle());
        if (!live) return;
        if (!row || row.owner_id !== session.id) { toast("You can only edit your own surveys"); router.replace("/dashboard"); return; }
        const b = reg([row])[0];
        ref.current = b; setS(b); setStatus("ok");
      } catch (e) { if (live) { console.error(e); setError(e); setStatus("err"); } }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session && session.id, id]);

  /* ---------- autosave ---------- */
  const flushSave = useCallback(async () => {
    clearTimeout(saveT.current); saveT.current = null;
    const b = ref.current;
    if (!b) return;
    try {
      // Build update payload; only include expires_at when it has a value
      // to avoid errors if the column doesn't exist yet in the DB schema.
      const payload = {
        title: (b.title || "Untitled").slice(0, 200),
        description: (b.description || "").slice(0, 1000),
        category: b.category,
        mode: b.mode,
        theme: b.theme,
        questions: b.questions,
      };
      if (b.expiresAt) payload.expires_at = new Date(b.expiresAt).toISOString();

      const saved = await q(
        sb.from("surveys")
          .update(payload)
          .eq("id", b.id)
          .eq("owner_id", b.ownerId)
          .eq("status", "draft")
          .select("id")
          .maybeSingle()
      );
      if (!saved) throw new Error("Your changes weren't saved. Check that you own this survey and have permission to edit it.");
      setSaveState("All changes saved ✓");
    } catch (e) {
      setSaveState("⚠ Save failed");
      // Show a friendly message instead of raw Supabase error
      const msg = e.message || "";
      if (msg.includes("permission denied") || msg.includes("42501")) {
        toast("Save failed: check Supabase RLS policy for the surveys table.");
      } else if (msg.includes("column") || msg.includes("does not exist")) {
        toast("Save failed: DB schema may be missing the expires_at column. Run the migration in Supabase.");
      } else {
        toast(e.message);
      }
    }
  }, [toast]);

  const mutate = (fn) => {
    if (ref.current && ref.current.status !== "draft") {
      toast("Live surveys are locked and cannot be edited.");
      return;
    }
    const next = fn(ref.current);
    ref.current = next; setS(next);
    setSaveState("Saving…");
    clearTimeout(saveT.current);
    saveT.current = setTimeout(flushSave, 700);
  };

  // save pending edits when leaving the page; warn when closing the tab mid-save
  useEffect(() => {
    const warn = (e) => { if (saveT.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); if (saveT.current) flushSave(); };
  }, [flushSave]);

  if (!ready) return <Loading />;
  if (!session) return <NeedAuth msg="Sign in to edit surveys." />;
  if (status === "err") return <Fail error={error} onRetry={() => router.refresh()} />;
  if (status !== "ok" || !s) return <Loading />;
  if (s.status === "published") {
    return (
      <div className="wrap page">
        <div className="card empty">
          <div className="big"><LockKeyhole size={38} /></div>
          <h1>Survey is live</h1>
          <p>Live surveys are locked and cannot be edited.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <Link className="btn btn-p" href={`/s/${s.slug}`}>Open live survey</Link>
            <Link className="btn btn-g" href={`/results/${s.id}`}>View results</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- edit helpers ---------- */
  const field = (k, v) => mutate((b) => ({ ...b, [k]: v }));
  const updQ = (qid, fn) => mutate((b) => ({ ...b, questions: b.questions.map((x) => (x.id === qid ? fn(x) : x)) }));

  function addQ() {
    const type = s.questions[0] ? s.questions[0].type : "single";
    if (!QUESTION_TYPES[type]) { toast("This survey has an unsupported question type"); return; }
    if (s.questions.length >= MAX_REGULAR_Q) { toast(`Max ${MAX_REGULAR_Q} questions per survey`); return; }
    const x = newQuestion(type);
    mutate((b) => ({ ...b, questions: [...b.questions, x] }));
  }
  function addOpt(qid) { updQ(qid, (x) => ({ ...x, options: [...x.options, "Option " + (x.options.length + 1)] })); }
  function delOpt(qid, j) {
    const x = s.questions.find((y) => y.id === qid);
    if (x.options.length > 2) updQ(qid, (y) => ({ ...y, options: y.options.filter((_, k) => k !== j) }));
    else toast("Keep at least 2 options");
  }
  function setOpt(qid, j, v) { updQ(qid, (x) => ({ ...x, options: x.options.map((o, k) => (k === j ? v : o)) })); }
  function move(qid, d) {
    mutate((b) => {
      const a = [...b.questions], i = a.findIndex((x) => x.id === qid), j = i + d;
      if (j < 0 || j >= a.length) return b;
      [a[i], a[j]] = [a[j], a[i]];
      return { ...b, questions: a };
    });
  }
  function dupQ(qid) {
    if (s.questions.length >= MAX_REGULAR_Q) { toast(`Max ${MAX_REGULAR_Q} questions per survey`); return; }
    mutate((b) => {
      const a = [...b.questions], i = a.findIndex((x) => x.id === qid);
      const c = JSON.parse(JSON.stringify(a[i])); c.id = uid();
      a.splice(i + 1, 0, c);
      return { ...b, questions: a };
    });
  }
  function delQ(qid) {
    if (s.questions.length <= MIN_REGULAR_Q) { toast(`Keep at least ${MIN_REGULAR_Q} questions`); return; }
    if (!confirm("Delete this question?")) return;
    mutate((b) => ({ ...b, questions: b.questions.filter((x) => x.id !== qid) }));
  }

  /* ---------- actions ---------- */
  async function publish() {
    try {
      const questions = ref.current ? ref.current.questions : s.questions;
      const validationError = validateSurveyQuestions(questions);
      if (validationError) { toast(validationError); return; }
      if (saveT.current) await flushSave();
      await q(sb.from("surveys").update({ status: "published", published_at: new Date().toISOString() }).eq("id", s.id));
      const next = { ...ref.current, status: "published" };
      ref.current = next; setS(next);
      toast("Published! 🎉");
      openShare(next);
    } catch (e) { toast(e.message); }
  }
  async function duplicateSurvey() {
    try {
      if (saveT.current) await flushSave();
      const c = await insertSurvey(session.id, {
        title: (s.title + " (copy)").slice(0, 200), description: s.description, category: s.category, mode: s.mode, theme: s.theme,
        questions: JSON.parse(JSON.stringify(s.questions)).map((x) => ({ ...x, id: uid() })),
        expiresAt: s.expiresAt || null,
      });
      toast("Duplicated ✨");
      router.push("/builder/" + c.id);
    } catch (e) { toast(e.message); }
  }
  function preview(e) {
    const validationError = validateSurveyQuestions(ref.current ? ref.current.questions : s.questions);
    if (validationError) {
      e.preventDefault();
      toast(validationError);
    }
  }

  return (
    <div className="wrap page" style={{ maxWidth: 1240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".8rem", flexWrap: "wrap", marginBottom: "1.3rem" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <input className="title-input" maxLength={200} value={s.title} onChange={(e) => field("title", e.target.value)} />
          <div className="muted small" style={{ marginTop: ".3rem" }}>
            {s.category} · {s.mode} mode · {s.status === "draft" ? "📝 Draft" : "🟢 Live"} · <span>{saveState}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button className="btn btn-g" onClick={duplicateSurvey}>⧉ Duplicate</button>
          <Link className="btn btn-g" href={`/results/${s.id}`}>📊 Results</Link>
          {s.status === "draft"
            ? <button className="btn btn-p" onClick={publish}>🚀 Publish</button>
            : <button className="btn btn-p" onClick={() => openShare(s)}>↗ Share</button>}
        </div>
      </div>

      <div className="builder">
        <div className="panel card">
          <h4>Question type</h4>
          <span className="chip">{QUESTION_TYPES[s.questions[0] ? s.questions[0].type : "single"].label}</span>
          <button className="btn btn-p btn-s" style={{ width: "100%", marginTop: ".8rem" }} disabled={s.questions.length >= MAX_REGULAR_Q} onClick={addQ}>
            Add question ({s.questions.length}/{MAX_REGULAR_Q})
          </button>
          <p className="tiny muted" style={{ marginTop: ".5rem" }}>A survey needs at least {MIN_REGULAR_Q} questions.</p>
        </div>

        <div id="b-canvas">
          {!s.questions.length && <div className="card empty"><div className="big"><Puzzle size={38} /></div>Add your first question from the left panel.</div>}
          {s.questions.map((x, i) => (
            <div className="card qcard" key={x.id}>
              <div className="qh">
                <span className="qnum">{i + 1}</span>
                <span className="chip"><Icon name={QUESTION_TYPES[x.type].icon} size={14} /> {QUESTION_TYPES[x.type].label}</span>
                <div className="qtools">
                  <button title="Move up" onClick={() => move(x.id, -1)} disabled={i === 0} style={i === 0 ? { opacity: 0.3 } : undefined}><ArrowUp size={16} /></button>
                  <button title="Move down" onClick={() => move(x.id, 1)} disabled={i === s.questions.length - 1} style={i === s.questions.length - 1 ? { opacity: 0.3 } : undefined}><ArrowDown size={16} /></button>
                  <button title="Duplicate" onClick={() => dupQ(x.id)}><Copy size={16} /></button>
                  <button title={s.questions.length <= MIN_REGULAR_Q ? `Keep at least ${MIN_REGULAR_Q} questions` : "Delete"} style={{ color: "var(--bad)", opacity: s.questions.length <= MIN_REGULAR_Q ? 0.3 : undefined }} disabled={s.questions.length <= MIN_REGULAR_Q} onClick={() => delQ(x.id)}><Trash2 size={16} /></button>
                </div>
              </div>
              <input className="qtext" value={x.text} placeholder="Type your question…" onChange={(e) => updQ(x.id, (y) => ({ ...y, text: e.target.value }))} />
              {x.type === "yesno" && <div className="muted small" style={{ display: "flex", gap: ".5rem" }}><span className="chip">Yes</span><span className="chip">No</span></div>}
              {x.type === "rating" && <div style={{ color: "#ffb020", fontSize: "1.3rem" }}>★★★★★ <span className="tiny muted">/ 5 stars</span></div>}
              {x.type === "nps" && <div className="tiny muted">Respondents pick 0 (not likely) → 10 (very likely)</div>}
              {QUESTION_TYPES[x.type].hasOptions && (
                <>
                  <div>
                    {x.options.map((o, j) => (
                      <div className="opt-row" key={j}>
                        <span className="drag"><GripVertical size={18} /></span>
                        <input value={o} onChange={(e) => setOpt(x.id, j, e.target.value)} />
                        <button className="btn btn-d btn-s" onClick={() => delOpt(x.id, j)}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-g btn-s" onClick={() => addOpt(x.id)}>+ Add option</button>
                </>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginTop: ".9rem" }}>
                <label className="switch">
                  <input type="checkbox" checked={!!x.required} onChange={(e) => updQ(x.id, (y) => ({ ...y, required: e.target.checked }))} />
                  <span className="sl" />
                </label>
                <span className="tiny muted">Required</span>
              </div>
            </div>
          ))}
          <div className="builder-preview">
            <a className="btn btn-g" href={`/s/${s.slug}?preview=all`} target="_blank" rel="noopener" onClick={preview}><Eye size={16} /> Preview</a>
          </div>
        </div>

        <div className="panel card">
          <h4>Survey settings</h4>
          <label>Description</label>
          <textarea rows={3} maxLength={1000} value={s.description} onChange={(e) => field("description", e.target.value)} />
          <label style={{ marginTop: ".8rem" }}>Category</label>
          <select value={s.category} onChange={(e) => field("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <label style={{ marginTop: ".8rem" }}>Vibe</label>
          <select value={s.mode} onChange={(e) => field("mode", e.target.value)}>
            <option value="social">Social</option><option value="professional">Professional</option>
          </select>
          <label style={{ marginTop: ".8rem" }}>Time limit / Deadline</label>
          <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", marginTop: ".2rem" }}>
            {[
              // { id: "none", label: "No limit" },
              { id: "15d", label: "15d" },
              { id: "30d", label: "30d" },
              { id: "custom", label: "Till date" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="tab"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "999px",
                  padding: ".3rem .75rem",
                  fontSize: ".78rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  background: (opt.id === "none" && !s.expiresAt) || (opt.id !== "none" && s.expiresAt) ? "var(--ink)" : "var(--surface)",
                  color: (opt.id === "none" && !s.expiresAt) || (opt.id !== "none" && s.expiresAt) ? "var(--bg)" : "var(--muted)",
                }}
                onClick={() => {
                  if (opt.id === "none") field("expiresAt", null);
                  else if (opt.id === "15d") field("expiresAt", Date.now() + 15 * 86400000);
                  else if (opt.id === "30d") field("expiresAt", Date.now() + 30 * 86400000);
                  else if (opt.id === "custom") field("expiresAt", s.expiresAt || (Date.now() + 7 * 86400000));
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {s.expiresAt && (
            <div style={{ marginTop: ".5rem" }}>
              <input
                type="datetime-local"
                value={new Date(s.expiresAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => field("expiresAt", e.target.value ? new Date(e.target.value).getTime() : null)}
                style={{ fontSize: ".82rem", padding: ".4rem .6rem" }}
              />
              <p className="tiny muted" style={{ marginTop: ".2rem" }}>
                {Date.now() > s.expiresAt ? "⚠️ Closed on: " : "Closes: "}
                {new Date(s.expiresAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          )}
          <label style={{ marginTop: ".8rem" }}>Theme</label>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            {THEMES.map((t) => <div key={t[0]} className={`theme-dot ${(s.theme || "th-royal") === t[0] ? "on" : ""}`} style={{ background: t[1] }} onClick={() => field("theme", t[0])} />)}
          </div>
          {/* JSON import/export controls are hidden for both desktop and mobile layouts. */}
          {/* <p className="tiny muted" style={{ marginTop: ".9rem" }}>💡 Coming in Phase 3: AI question writer, conditional logic & branching.</p> */}
        </div>
      </div>
    </div>
  );
}
