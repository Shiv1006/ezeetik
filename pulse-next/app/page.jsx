"use client";
import Link from "next/link";
import { useState } from "react";
import { useAsync } from "@/lib/hooks";
import { cnt, fetchPublished, trendRank } from "@/lib/data";
import SurveyCard from "@/components/SurveyCard";
import { Fail, Loading } from "@/components/Ui";
import { ArrowRight, BarChart3, Check, Flame, Rocket, Share2, Sparkles, TrendingUp, Zap } from "lucide-react";

const MARQUEE = ["Personality quizzes","Customer feedback","Market research","Classroom polls","Employee pulse","Product research","Fun polls","Event feedback","NPS tracking"];
const MINI = { q: "What's your favorite way to learn?", opts: ["🎥 Videos", "📚 Books", "🛠️ Projects", "🎓 Courses"], votes: [38, 17, 32, 13] };

function MiniSurvey() {
  const [votes, setVotes] = useState(MINI.votes);
  const [picked, setPicked] = useState(null);
  const answered = picked !== null;
  const total = votes.reduce((a, b) => a + b, 0);
  const pick = (i) => {
    if (answered) return;
    setVotes((v) => v.map((n, j) => (j === i ? n + 1 : n)));
    setPicked(i);
  };
  if (answered) {
    const pp = Math.round((votes[picked] / total) * 100);
    return (
      <>
        <h3>{MINI.q}</h3>
        <div className="mini-q">
          {MINI.opts.map((o, i) => {
            const p = Math.round((votes[i] / total) * 100);
            return (
              <div key={i} className={`mini-opt ${picked === i ? "picked" : ""}`}>
                <i className="bar" style={{ width: p + "%" }} /><span><b>{p}%</b> · {o}</span>
              </div>
            );
          })}
        </div>
        <div className="mini-result" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}><Check size={16} /> You're with the {pp}%! <Link href="/create" style={{ textDecoration: "underline", color: "var(--accent1)" }}>Create your own</Link></div>
      </>
    );
  }
  return (
    <>
      <h3>{MINI.q}</h3>
      <p className="muted tiny">Tap an answer to see live results</p>
      <div className="mini-q">
        {MINI.opts.map((o, i) => <button key={i} className="mini-opt" onClick={() => pick(i)}><span>{o}</span></button>)}
      </div>
    </>
  );
}

export default function Home() {
  const { data: pub, loading, error, reload } = useAsync(fetchPublished, []);
  if (loading) return <Loading />;
  if (error) return <Fail error={error} onRetry={reload} />;

  const trending = [...pub].sort((a, b) => trendRank(b) - trendRank(a)).slice(0, 3);
  const totalShares = pub.reduce((n, s) => n + (s.shares || 0), 0);
  const totalResp = pub.reduce((n, s) => n + cnt(s.id), 0);

  return (
    <>
      <section className="hero">
        <div className="mesh" /><div className="grid-bg" />
        <div className="wrap hero-grid">
          <div>
            <span className="pill"><b>New</b>{totalResp} responses collected on EzeeTik</span>
            <h1 className="display">Surveys people <span className="hl">actually</span> want to <span className="grad-text">answer.</span></h1>
            <p className="lead">Beautiful, snackable surveys with one-tap sharing, live results and a discovery feed that helps great questions spread on their own.</p>
            <div className="hero-cta">
              <Link className="btn btn-p btn-lg" href="/create">Create a survey →</Link>
              <Link className="btn btn-g btn-lg" href="/discover">Explore surveys</Link>
            </div>
            <div className="trust"><span>No signup to answer</span><span>~30s per survey</span><span>Live results</span></div>
          </div>
          <div className="stage">
            <div className="float f1"><i><Flame size={15} /></i>Trending now</div>
            <div className="card mini-survey"><span className="chip cat">⚡ Live demo — try it</span><div id="mini-q"><MiniSurvey /></div></div>
            <div className="float f2"><i><TrendingUp size={15} /></i>{totalResp} total responses</div>
            <div className="float f3"><i><Share2 size={15} /></i>Shared {totalShares}×</div>
          </div>
        </div>
      </section>

      <div className="strip"><div className="strip-track">{[...MARQUEE, ...MARQUEE].map((m, i) => <span key={i}>{m}</span>)}</div></div>

      <section className="wrap sec">
        <div className="sec-head center"><h2 className="sec-title">From question to viral loop in minutes</h2><p className="sec-sub">Three steps. Every screen nudges the loop forward.</p></div>
        <div className="steps">
          <div className="card step"><h4>Create</h4><p className="muted">Pick a question type, write your prompt, choose a theme. Publish in under a minute.</p></div>
          <div className="card step"><h4>Share</h4><p className="muted">WhatsApp, X, Telegram, QR codes and story cards — one tap each.</p></div>
          <div className="card step"><h4>Watch it grow</h4><p className="muted">Respondents see results, share them and bring friends. Your survey climbs Trending.</p></div>
        </div>
      </section>

      <section className="wrap sec">
        <div className="bento">
          <div className="card tile col t1"><div className="deco" /><div className="share-row"><span><Share2 size={14} /></span><span><Sparkles size={14} /></span><span>X</span><span>in</span><span>QR</span></div><span className="big-ic"><Rocket /></span><h4>Share everywhere</h4><p>One tap to WhatsApp, X, Telegram, LinkedIn — plus QR codes and downloadable story cards.</p></div>
          <div className="card tile t2"><span className="big-ic"><Zap /></span><h4>Create fast</h4><p>10 question types. AI generation coming in Phase 3.</p></div>
          <div className="card tile t3"><span className="big-ic"><Flame /></span><h4>Viral score</h4><p>Velocity, shares and completion — not just raw counts.</p></div>
          <div className="card tile dark t4"><div className="mini-bars">{[28,44,36,58,48,70,92].map((h, i) => <i key={i} style={{ height: h + "%" }} />)}</div><span className="big-ic"><BarChart3 /></span><h4>Understand your audience</h4><p>Live analytics, completion time, NPS and keyword themes for every question.</p></div>
        </div>
      </section>

      <section className="wrap sec">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.8rem" }}>
          <div><h2 className="sec-title" style={{ marginBottom: ".3rem" }}>Trending right now</h2><p className="sec-sub">Ranked by velocity, shares and completion.</p></div>
          <Link className="btn btn-g" href="/discover">View all →</Link>
        </div>
        {trending.length
          ? <div className="survey-grid">{trending.map((s) => <SurveyCard key={s.id} s={s} />)}</div>
          : <div className="card empty"><div className="big">🌱</div>No surveys yet — be the first to publish one!</div>}
      </section>

      <section className="wrap sec">
        <div className="cta">
          <h2>Your next survey could be the one everyone shares.</h2>
          <p>Free to start · {pub.length} surveys live · {totalShares} shares and counting</p>
          <Link className="btn btn-p btn-lg" href="/create">Create your first survey →</Link>
        </div>
      </section>
    </>
  );
}
