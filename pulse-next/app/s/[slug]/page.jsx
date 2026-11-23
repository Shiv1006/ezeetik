"use client";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { useAsync, useSurveyTheme } from "@/lib/hooks";
import { catMeta } from "@/lib/constants";
import { COUNTS, SURVEY_SEL, bump, bumpShares, cnt, q, reg, validateSurveyQuestions } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { confettiBurst, estTime, store, surveyURL } from "@/lib/utils";
import { Fail, Loading } from "@/components/Ui";
import { ArrowLeft, Check, Clock, Star, X, PartyPopper } from "lucide-react";
import { ArrowUpRight, BadgeCheck, Eye, Link2, MessageCircle, Pencil, Plus, Rocket, Share2 } from "lucide-react";

export const dynamic = "force-dynamic";

function TakeContent() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const allQuestionPreview = searchParams.get("preview") === "all";
  const { data, loading, error, reload } = useAsync(async () => {
    const row = await q(sb.from("surveys").select(SURVEY_SEL).eq("slug", slug).maybeSingle());
    if (!row) return { notFound: true };
    const s = reg([row])[0];
    const c = await q(sb.from("survey_counts").select("response_count").eq("survey_id", s.id).maybeSingle());
    COUNTS[s.id] = c ? c.response_count : 0;
    if (s.status === "published") { // count a view once per browser session
      const k = "pv_" + s.id;
      try {
        if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); bump(s.id, "views"); s.views++; }
      } catch (e) {}
    }
    return { s };
  }, [slug]);

  if (loading) return <Loading />;
  if (error) return <Fail error={error} onRetry={reload} />;
  if (data.notFound) {
    return (
      <div className="wrap page"><div className="card empty"><div className="big">😢</div>Survey not found, or it hasn't been published yet.<br /><br /><Link className="btn btn-g" href="/discover">Explore surveys</Link></div></div>
    );
  }
  return <Take key={`${data.s.id}-${allQuestionPreview ? "all-preview" : "normal"}`} s={data.s} allQuestionPreview={allQuestionPreview} />;
}

export default function TakePage() {
  return (
    <Suspense fallback={<Loading />}>
      <TakeContent />
    </Suspense>
  );
}

function Take({ s, allQuestionPreview }) {
  const { session, toast, copyText, openShare } = useApp();
  useSurveyTheme(s.theme);

  // Deadline only applies to published surveys — drafts are never "closed"
  const isExpired = s.status === "published" && !!s.expiresAt && Date.now() > s.expiresAt;

  const [phase, setPhase] = useState(() => (store.get("pulse_responded", {})[s.id] && s.status === "published" ? "already" : "intro"));
  const [isPublished, setIsPublished] = useState(s.status === "published");
  const [publishing, setPublishing] = useState(false);
  const [answersSaved, setAnswersSaved] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [shake, setShake] = useState(false);
  const idxRef = useRef(0), ansRef = useRef({}), startRef = useRef(null), busy = useRef(false);

  const total = s.questions.length;
  const isOwner = session && session.id === s.ownerId;
  const goto = (i) => { idxRef.current = i; setIdx(i); };
  const setAnswer = (x, v, autoMs) => {
    const next = { ...ansRef.current, [x.id]: v };
    ansRef.current = next; setAnswers(next);
    if (autoMs) setTimeout(advance, autoMs);
  };
  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 350); };

  function start() {
    if (isExpired) {
      toast("This survey is closed. Responses are no longer accepted.");
      return;
    }
    if (!isPublished) {
      const validationError = validateSurveyQuestions(s.questions);
      if (validationError) { toast(validationError); return; }
    }
    startRef.current = Date.now(); goto(0); setPhase("take");
  }

  async function publishFromPreview() {
    if (!isOwner) return;
    const validationError = validateSurveyQuestions(s.questions);
    if (validationError) { toast(validationError); return; }
    setPublishing(true);
    try {
      await q(sb.from("surveys").update({
        status: "published",
        published_at: new Date().toISOString(),
      }).eq("id", s.id).eq("owner_id", session.id).select("id").single());
      s.status = "published";
      setIsPublished(true);
      confettiBurst();
      toast("Survey is live! 🎉 Ready to share.");
      openShare({ ...s, status: "published" });
    } catch (e) { toast(e.message); }
    finally { setPublishing(false); }
  }

  function advance() {
    if (busy.current) return;
    const i = idxRef.current, x = s.questions[i], v = ansRef.current[x.id];
    const empty = v == null || v === "" || (Array.isArray(v) && !v.length);
    if (x.required && empty) { toast("Please answer to continue 👇"); doShake(); return; }
    if (!empty && x.type === "email" && !/^\S+@\S+\.\S+$/.test(v)) { toast("Please enter a valid email"); return; }
    if (i < total - 1) goto(i + 1); else submit();
  }
  function back() { if (idxRef.current > 0) goto(idxRef.current - 1); }

  async function submit() {
    if (isExpired) {
      toast("This survey is closed. Responses cannot be saved.");
      return;
    }
    const clean = {};
    for (const x of s.questions) {
      const v = ansRef.current[x.id];
      if (v != null && v !== "" && !(Array.isArray(v) && !v.length)) clean[x.id] = v;
    }
    if (!isPublished) { toast("Preview only — nothing was saved"); setPhase("done"); return; }
    busy.current = true;
    try {
      await q(sb.from("responses").insert({
        survey_id: s.id, answers: clean,
        duration_ms: Math.min(86400000, Math.max(0, Date.now() - (startRef.current || Date.now()))),
      }));
      const r = store.get("pulse_responded", {}); r[s.id] = true; store.set("pulse_responded", r);
      COUNTS[s.id] = cnt(s.id) + 1;
      confettiBurst();
      setAnswersSaved(true);
      setPhase("done");
    } catch (e) { toast("Couldn't save your answers: " + e.message); }
    finally { busy.current = false; }
  }

  if (isExpired && !allQuestionPreview) {
    return (
      <div className="take-wrap">
        <div className="card take-card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div className="completion-icon" style={{ background: "color-mix(in srgb, var(--bad) 12%, var(--surface))", color: "var(--bad)", margin: "0 auto 1.2rem" }}>
            <Clock size={44} />
          </div>
          <span className="chip" style={{ color: "var(--bad)", borderColor: "var(--bad)", fontWeight: 700, marginBottom: ".8rem" }}>
            ● Survey Closed
          </span>
          <h1 style={{ fontSize: "clamp(1.8rem, 4.5vw, 2.4rem)", fontWeight: 800, letterSpacing: "-.04em", margin: ".5rem 0 .7rem" }}>
            {s.title}
          </h1>
          <p className="muted" style={{ maxWidth: "480px", margin: "0 auto 1.5rem", fontSize: "1.05rem" }}>
            This survey is closed. The deadline to submit responses has passed.
          </p>
          <div className="banner" style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", background: "var(--surface2)", borderColor: "var(--line)", color: "var(--muted)", fontSize: ".85rem" }}>
            <span>Closed on {new Date(s.expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <div style={{ display: "flex", gap: ".6rem", justifyContent: "center", flexWrap: "wrap", marginTop: "2rem" }}>
            <Link className="btn btn-g" href="/discover">Explore other surveys</Link>
            <Link className="btn btn-k" href={`/peek/${s.slug}`}><Eye size={16} /> View results</Link>
          </div>
        </div>
      </div>
    );
  }

  if (allQuestionPreview) {
    const exitHref = isOwner && !isPublished ? `/builder/${s.id}` : `/s/${s.slug}`;
    return (
      <div className="take-wrap">
        <div className="take-head">
          <span className="muted small">{isPublished ? "All questions" : "All questions · Preview"}</span>
          {isPublished && (
            <span className="chip" style={{ color: "var(--good)", fontWeight: 700, borderColor: "color-mix(in srgb, var(--good) 40%, transparent)" }}>
              ● Live survey
            </span>
          )}
        </div>
        {isPublished ? (
          <div className="banner" style={{ background: "color-mix(in srgb, var(--good) 14%, var(--surface))", borderColor: "color-mix(in srgb, var(--good) 45%, var(--line))", color: "var(--ink)", padding: "1rem 1.25rem", borderRadius: "16px", marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".8rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 800, fontSize: "1.05rem", color: "var(--good)" }}>
                  <Check size={20} strokeWidth={2.5} /> Survey is live!
                </div>
                <p className="tiny muted" style={{ marginTop: ".25rem" }}>
                  Anyone with the link can now participate. Responses are being recorded live.
                </p>
              </div>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                <button className="btn btn-s btn-g" onClick={() => copyText(surveyURL(s))}><Link2 size={14} /> Copy link</button>
                <button className="btn btn-s btn-p" onClick={() => openShare({ ...s, status: "published" })}><Share2 size={14} /> Share</button>
                {isOwner && <Link href={`/results/${s.id}`} className="btn btn-s btn-g">Results</Link>}
              </div>
            </div>
          </div>
        ) : (
          <div className="banner">Preview mode — all questions are shown together. Answers won’t be saved.</div>
        )}
        <div className="card take-card" style={{ padding: "1.4rem" }}>
          <span className="chip cat">{s.category}</span>
          <h1 style={{ fontSize: "clamp(1.7rem,4vw,2.2rem)", fontWeight: 800, letterSpacing: "-.04em", margin: ".8rem 0 .4rem" }}>{s.title}</h1>
          {s.description && <p className="muted" style={{ marginBottom: "1.2rem" }}>{s.description}</p>}
          {s.questions.map((question, index) => {
            const options = Array.isArray(question.options) ? question.options : [];
            let responsePreview;

            if (["single", "dropdown", "multi"].includes(question.type)) {
              responsePreview = options.map((option, optionIndex) => (
                <div className="opt-big" key={`${question.id}-${optionIndex}`} style={{ pointerEvents: "none" }}>
                  <span className="k">{question.type === "multi" ? "□" : String.fromCharCode(65 + optionIndex)}</span>{option}
                </div>
              ));
            } else if (question.type === "yesno") {
              responsePreview = ["Yes", "No"].map((option, optionIndex) => (
                <div className="opt-big" key={`${question.id}-${option}`} style={{ pointerEvents: "none" }}>
                  <span className="k">{optionIndex === 0 ? <Check size={15} /> : <X size={15} />}</span>{option}
                </div>
              ));
            } else if (question.type === "rating") {
              responsePreview = <div className="stars" style={{ color: "#ffb020" }}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={28} />)}</div>;
            } else if (question.type === "nps") {
              responsePreview = <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem" }}>{Array.from({ length: 11 }, (_, score) => <span className="chip" key={score}>{score}</span>)}</div>;
            } else {
              responsePreview = question.type === "longtext"
                ? <textarea rows={3} disabled placeholder="Long text answer" />
                : <input disabled placeholder={question.type === "email" ? "you@example.com" : question.type === "number" ? "0" : "Short text answer"} />;
            }

            return (
              <section className="card card-p" key={question.id} style={{ padding: "1.1rem", marginTop: "1rem" }}>
                <div className="tiny muted" style={{ marginBottom: ".5rem" }}>Question {index + 1}</div>
                <h2 className="q-text" style={{ marginBottom: "1rem" }}>{question.text}{question.required ? <span className="req"> *</span> : null}</h2>
                {responsePreview}
              </section>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <Link href={exitHref} className="btn btn-g"><ArrowLeft size={16} /> Exit preview</Link>
            {isOwner && isPublished && <Link href={`/results/${s.id}`} className="btn btn-g">View results</Link>}
          </div>
          {isOwner && !isPublished && (
            <button className="btn btn-p" disabled={publishing} onClick={publishFromPreview}>
              <Rocket size={16} /> {publishing ? "Publishing…" : "Publish survey"}
            </button>
          )}
          {isPublished && (
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
              <button className="btn btn-g" onClick={() => copyText(surveyURL(s))}><Link2 size={16} /> Copy link</button>
              <button className="btn btn-p" onClick={() => openShare({ ...s, status: "published" })}><Share2 size={16} /> Share survey</button>
              <Link href={`/s/${s.slug}`} className="btn btn-k"><Eye size={16} /> Take live survey</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- intro ---------- */
  if (phase === "intro") {
    const m = catMeta(s.category);
    const previewError = isPublished ? null : validateSurveyQuestions(s.questions);
    return (
      <div className="take-wrap">
        {!isPublished && <div className="banner">👁 Preview mode — this survey is still a draft. Answers won't be saved.</div>}
        <div className="card take-card" style={{ textAlign: "center", padding: "2.6rem 2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: ".4rem" }}>{m.e}</div>
          <span className="chip cat">{s.category}</span>
          <h2 style={{ fontSize: "clamp(1.9rem,5vw,2.6rem)", fontWeight: 800, letterSpacing: "-.04em", margin: "1rem 0 .6rem" }}>{s.title}</h2>
          <p className="muted">{s.description || "A quick survey — tap through and see how others answered."}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: ".5rem", margin: "1.5rem 0", flexWrap: "wrap" }}>
            <span className="chip">🧩 {total} questions</span><span className="chip">⏱ ~{estTime(s)} seconds</span><span className="chip">▶ {cnt(s.id)} answered</span>
            {s.expiresAt && (
              <span className="chip" style={{ color: "var(--accent1)" }}>
                <Clock size={12} /> Deadline: {new Date(s.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          {total && !previewError
            ? <button className="btn btn-p btn-lg" style={{ padding: "1rem 2.8rem" }} onClick={start}>Start →</button>
            : <p className="muted small">{previewError || "This survey has no questions yet."}</p>}
          {isOwner && !isPublished && (
            <div style={{ display: "flex", justifyContent: "center", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <Link className="btn btn-g" href={`/builder/${s.id}`}><Pencil size={16} /> Edit survey</Link>
              <button className="btn btn-p" disabled={publishing} onClick={publishFromPreview}><Rocket size={16} /> {publishing ? "Publishing…" : "Publish survey"}</button>
            </div>
          )}
          {isOwner && isPublished && (
            <div style={{ display: "flex", justifyContent: "center", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <button className="btn btn-g" onClick={() => copyText(surveyURL(s))}><Link2 size={16} /> Copy link</button>
              <button className="btn btn-p" onClick={() => openShare({ ...s, status: "published" })}><Share2 size={16} /> Share survey</button>
              <Link href={`/results/${s.id}`} className="btn btn-g">View results</Link>
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: "1.1rem" }}>By @{s.creator} · Anonymous · no account needed</p>
        </div>
      </div>
    );
  }

  /* ---------- completion ---------- */
  if (phase === "done" || phase === "already") {
    const already = phase === "already";
    const url = surveyURL(s);
    const enc = encodeURIComponent;
    return (
      <div className="take-wrap">
        <div className="card take-card" style={{ textAlign: "center", padding: "2.6rem 2rem" }}>
          <div className="completion-icon">{already ? <BadgeCheck size={52} /> : <PartyPopper size={52} />}</div>
          <h2 style={{ fontSize: "clamp(1.7rem,4.5vw,2.3rem)", fontWeight: 800, letterSpacing: "-.04em" }}>
            {already ? "You already answered this one" : answersSaved ? "You completed the survey!" : "You completed the preview!"}
          </h2>
          <p className="muted" style={{ marginTop: ".4rem" }}>
            {already
              ? "Your answers are in. Here it is again in case you want to share it:"
              : answersSaved ? "Your answers have been recorded." : "Preview only — your answers were not saved."}
          </p>
          {isPublished ? (
            <>
              <h3 style={{ margin: "2rem 0 .3rem", fontSize: "1.25rem" }}>Share this survey</h3>
              <p className="tiny muted" style={{ marginBottom: "1rem", display: "inline-flex", alignItems: "center", gap: ".3rem" }}>You answered it — now challenge your friends <Eye size={14} /></p>
              <div style={{ display: "flex", gap: ".5rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.6rem" }}>
                <a className="btn btn-p" target="_blank" rel="noopener" href={`https://wa.me/?text=${enc(`I just answered "${s.title}" — can you beat my answers? 😉\n\n${url}`)}`} onClick={() => bumpShares(s)}><MessageCircle size={17} /> WhatsApp</a>
                <a className="btn btn-g" target="_blank" rel="noopener" href={`https://twitter.com/intent/tweet?text=${enc(`I just took "${s.title}" 👀 what would you choose?`)}&url=${enc(url)}`} onClick={() => bumpShares(s)}><Share2 size={17} /> Share</a>
                <button className="btn btn-g" onClick={() => copyText(url)}><Link2 size={17} /> Copy link</button>
                <button className="btn btn-g" onClick={() => openShare(s)}><ArrowUpRight size={17} /> More…</button>
              </div>
              <div style={{ display: "flex", gap: ".6rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link className="btn btn-k" href={`/peek/${s.slug}`}><Eye size={17} /> See how others answered</Link>
                <Link className="btn btn-g" href="/create"><Plus size={17} /> Create your own</Link>
              </div>
            </>
          ) : (
            <div style={{ marginTop: "1.3rem" }}>
              <div className="banner">Publish this survey to enable sharing and collect responses.</div>
              {isOwner && (
                <div style={{ display: "flex", justifyContent: "center", gap: ".6rem", flexWrap: "wrap" }}>
                  <Link className="btn btn-g" href={`/builder/${s.id}`}><Pencil size={16} /> Edit survey</Link>
                  <button className="btn btn-p" disabled={publishing} onClick={publishFromPreview}><Rocket size={16} /> {publishing ? "Publishing…" : "Publish survey"}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- question ---------- */
  const x = s.questions[idx], val = answers[x.id];
  let body;
  if (x.type === "single" || x.type === "dropdown") {
    body = x.options.map((o, i) => (
      <button key={i} className={`opt-big ${val === o ? "sel" : ""}`} onClick={() => setAnswer(x, o, 260)}>
        <span className="k">{String.fromCharCode(65 + i)}</span>{o}
      </button>
    ));
  } else if (x.type === "multi") {
    const arr = Array.isArray(val) ? val : [];
    body = (
      <>
        {x.options.map((o, i) => (
          <button key={i} className={`opt-big ${arr.includes(o) ? "sel" : ""}`}
            onClick={() => setAnswer(x, arr.includes(o) ? arr.filter((a) => a !== o) : [...arr, o])}>
            <span className="k">{arr.includes(o) ? <Check size={14} /> : String.fromCharCode(65 + i)}</span>{o}
          </button>
        ))}
        <p className="tiny muted">Tap all that apply, then press Next</p>
      </>
    );
  } else if (x.type === "yesno") {
    body = [["Yes", "yes"], ["No", "no"]].map(([label, key]) => (
      <button key={key} className={`opt-big ${val === label ? "sel" : ""}`} onClick={() => setAnswer(x, label, 260)}>
        <span className="k">{key === "yes" ? <Check size={15} /> : <X size={15} />}</span>{label}
      </button>
    ));
  } else if (x.type === "rating") {
    body = (
      <>
        <div className="stars" style={{ justifyContent: "center", margin: ".6rem 0 1rem" }}>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} className={(val || 0) >= n ? "on" : ""} onClick={() => setAnswer(x, n, 300)}><Star size={32} fill={(val || 0) >= n ? "currentColor" : "none"} /></button>)}
        </div>
        <p className="tiny muted" style={{ textAlign: "center" }}>{val ? val + " / 5" : "Tap a star"}</p>
      </>
    );
  } else if (x.type === "nps") {
    body = (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(11,1fr)", gap: ".35rem", margin: ".5rem 0 1rem" }}>
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} className={`btn ${val === n ? "btn-p" : "btn-g"}`} style={{ padding: ".7rem 0", borderRadius: 12, fontSize: ".85rem" }} onClick={() => setAnswer(x, n)}>{n}</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }} className="tiny muted"><span>Not likely</span><span>Very likely</span></div>
      </>
    );
  } else if (x.type === "longtext") {
    body = <textarea rows={5} maxLength={2000} placeholder="Type your answer…" value={val || ""} onChange={(e) => setAnswer(x, e.target.value)} />;
  } else if (x.type === "number") {
    body = <input type="number" inputMode="numeric" placeholder="0" value={val ?? ""} onChange={(e) => setAnswer(x, e.target.value)} />;
  } else if (x.type === "email") {
    body = <input type="email" inputMode="email" placeholder="you@example.com" value={val || ""} onChange={(e) => setAnswer(x, e.target.value)} />;
  } else {
    body = <input maxLength={500} placeholder="Type your answer…" value={val || ""} onChange={(e) => setAnswer(x, e.target.value)} />;
  }
  const multi = x.type === "multi" || x.type === "longtext";

  return (
    <div className="take-wrap">
      <div className="take-head"><Link href="/" className="muted small" style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}><X size={15} /> Exit</Link><span className="muted small">Question {idx + 1} of {total}</span></div>
      <div className="progress"><i style={{ width: ((idx + 1) / total) * 100 + "%" }} /></div>
      <div className={`card take-card ${shake ? "shake" : ""}`}>
        <h2 className="q-text">{x.text} {x.required ? <span className="req">*</span> : null}</h2>
        {body}
        <div className="take-nav">
          <button className="btn btn-g" onClick={back} style={idx === 0 ? { visibility: "hidden" } : undefined}><ArrowLeft size={16} /> Back</button>
          <button className="btn btn-p" onClick={advance}>{idx === total - 1 ? <><PartyPopper size={16} /> Finish</> : "Next →"}</button>
        </div>
      </div>
      <p className="tiny muted" style={{ textAlign: "center", marginTop: "1rem" }}>{multi ? "" : "Tap an answer to continue instantly"}</p>
    </div>
  );
}
