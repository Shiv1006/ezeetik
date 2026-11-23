"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, MIN_REGULAR_Q, QUESTION_TYPES, REGULAR_QUESTION_TYPES, THEMES, newQuestion } from "@/lib/constants";
import { insertSurvey } from "@/lib/data";
import { Loading, NeedAuth } from "@/components/Ui";
import { Clock } from "lucide-react";

export default function Create() {
  const router = useRouter();
  const { session, ready, toast } = useApp();
  const [activeTab, setActiveTab] = useState("regular");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [questionType, setQuestionType] = useState("single");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [mode, setMode] = useState("social");
  const [theme, setTheme] = useState(THEMES[0][0]);
  const [timeLimitType, setTimeLimitType] = useState("none");
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  if (!ready) return <Loading />;
  if (!session) return <NeedAuth msg="Sign in to create a survey." />;

  async function createSurvey() {
    const t = title.trim();
    if (!t) { toast("Give your survey a title ✍️"); setShake(true); setTimeout(() => setShake(false), 350); return; }

    let expiresAt = null;
    if (timeLimitType === "15d") {
      expiresAt = new Date(Date.now() + 15 * 86400000).toISOString();
    } else if (timeLimitType === "30d") {
      expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    } else if (timeLimitType === "custom") {
      if (!customDate) {
        toast("Please choose a deadline date and time 📅");
        return;
      }
      const selected = new Date(customDate).getTime();
      if (selected <= Date.now()) {
        toast("Deadline must be a future date and time ⏰");
        return;
      }
      expiresAt = new Date(customDate).toISOString();
    }

    setBusy(true);
    try {
      const s = await insertSurvey(session.id, {
        title: t, description: desc.trim(), category: cat, mode, theme,
        questions: Array.from({ length: MIN_REGULAR_Q }, () => newQuestion(questionType)),
        expiresAt,
      });
      router.push("/builder/" + s.id);
    } catch (e) { toast(e.message); setBusy(false); }
  }

  return (
    <div className="wrap page" style={{ maxWidth: 700 }}>
      <div className="page-head"><h1>Create a survey</h1><p>Launch an interactive experience, not a form.</p></div>
      <div className="card card-p create-card">
        <div className="create-tabs" role="tablist" aria-label="Survey type">
          <button type="button" role="tab" aria-selected={activeTab === "regular"} className={`tab ${activeTab === "regular" ? "on" : ""}`} onClick={() => setActiveTab("regular")}>Regular survey</button>
          <button type="button" role="tab" aria-selected={activeTab === "advanced"} className={`tab ${activeTab === "advanced" ? "on" : ""}`} onClick={() => setActiveTab("advanced")}>Advanced</button>
        </div>
        {activeTab === "advanced" ? (
          <div className="card empty create-coming" role="tabpanel">
            <div className="big">✨</div>
            <b>Feature coming soon — stay tuned!</b>
          </div>
        ) : (
          <div className="create-form" role="tabpanel">
            <div>
              <label>Survey title</label>
              <input className={shake ? "shake" : ""} maxLength={200} placeholder="e.g. Which Smartphone Brand Are You?" style={{ fontSize: "1.1rem", fontWeight: 600 }} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label>Description</label>
              <textarea rows={3} maxLength={300} placeholder="Tell people why they should answer — and how long it takes." value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div>
              <label htmlFor="survey-question-type">Select type</label>
              <select id="survey-question-type" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                {REGULAR_QUESTION_TYPES.map((type) => <option key={type} value={type}>{QUESTION_TYPES[type].label}</option>)}
              </select>
              <p className="tiny muted" style={{ marginTop: ".35rem" }}>This type will be used for all questions in your survey.</p>
            </div>
            <div className="create-meta-grid">
              <div><label>Category</label><select value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label>Vibe</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="social">Social — fun & viral</option>
                  <option value="professional">Professional — business & research</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <Clock size={15} /> Time limit / Deadline
              </label>
              <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap", marginTop: ".3rem" }}>
                {[
                  // { id: "none", label: "No limit" },
                  { id: "15d", label: "15 days" },
                  { id: "30d", label: "30 days" },
                  { id: "custom", label: "Till date" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="tab"
                    style={{
                      border: "1.5px solid var(--line)",
                      borderRadius: "999px",
                      padding: ".5rem 1.1rem",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: ".86rem",
                      background: timeLimitType === opt.id ? "var(--ink)" : "var(--surface)",
                      color: timeLimitType === opt.id ? "var(--bg)" : "var(--muted)",
                      transition: "all .15s",
                    }}
                    onClick={() => setTimeLimitType(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {timeLimitType === "custom" && (
                <div style={{ marginTop: ".85rem", animation: "fadeUp .25s ease" }}>
                  <label style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: ".3rem" }}>
                    Select deadline date & time
                  </label>
                  <input
                    type="datetime-local"
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    style={{ maxWidth: "340px", fontSize: ".92rem" }}
                  />
                </div>
              )}

              {timeLimitType !== "none" && (
                <p className="tiny muted" style={{ marginTop: ".55rem" }}>
                  ⏳ Survey will automatically close on{" "}
                  <strong>
                    {timeLimitType === "15d" && new Date(Date.now() + 15 * 86400000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {timeLimitType === "30d" && new Date(Date.now() + 30 * 86400000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {timeLimitType === "custom" && customDate && new Date(customDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </strong>
                  . Afterwards, responses will no longer be accepted.
                </p>
              )}
            </div>
            <div>
              <label>Theme</label>
              <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap", marginTop: ".2rem" }}>
                {THEMES.map((t) => <div key={t[0]} className={`theme-dot ${theme === t[0] ? "on" : ""}`} style={{ background: t[1] }} onClick={() => setTheme(t[0])} />)}
              </div>
            </div>
            <button className="btn btn-p btn-lg" disabled={busy} onClick={createSurvey}>Continue to questions →</button>
          </div>
        )}
      </div>
    </div>
  );
}
