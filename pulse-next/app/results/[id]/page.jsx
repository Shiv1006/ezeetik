"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { useAsync, useSurveyTheme } from "@/lib/hooks";
import Link from "next/link";
import { SURVEY_SEL, aggregated, fetchAllResponses, q, reg, topWords } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { BarsHTML, Distr, Sparkline } from "@/components/ResultBars";
import { Fail, Loading, NeedAuth } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default function Results() {
  const { id } = useParams();
  const router = useRouter();
  const { session, ready, toast, openShare } = useApp();
  const { data, loading, error, reload } = useAsync(async () => {
    if (!session) return null;
    const row = await q(sb.from("surveys").select(SURVEY_SEL).eq("id", id).maybeSingle());
    if (!row || row.owner_id !== session.id) return { denied: true };
    const s = reg([row])[0];
    const rs = await fetchAllResponses(id);
    return { s, rs };
  }, [id, session && session.id, ready]);

  useSurveyTheme(data && data.s && data.s.theme);
  useEffect(() => {
    if (data && data.denied) { toast("Only the survey owner can see results"); router.replace("/dashboard"); }
  }, [data, toast, router]);

  if (!ready) return <Loading />;
  if (!session) return <NeedAuth msg="Sign in to view results." />;
  if (error) return <Fail error={error} onRetry={reload} />;
  if (loading || !data || data.denied) return <Loading />;

  const { s, rs } = data;
  const completed = rs.length;
  const avgDur = completed ? rs.reduce((n, r) => n + r.dur, 0) / completed : 0;
  const conv = s.views ? Math.min(100, Math.round((completed / s.views) * 100)) : 0;
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const perDay = days.map((d) => rs.filter((r) => { const t = new Date(r.ts); return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate(); }).length);
  const ag = aggregated(s, rs, false);

  function exportCSV() {
    const cell = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const head = ["response_id", "date", "duration_ms", ...s.questions.map((x) => x.text)].map(cell).join(",");
    const rows = rs.map((r) => [r.id, new Date(r.ts).toISOString(), r.dur, ...s.questions.map((x) => { const v = r.answers[x.id]; return Array.isArray(v) ? v.join(";") : v; })].map(cell).join(","));
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (s.title.replace(/\W+/g, "-").toLowerCase() || "survey") + "-responses.csv";
    a.click();
    toast("CSV downloaded ⬇");
  }

  return (
    <div className="wrap page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: ".8rem", marginBottom: "1.6rem" }}>
        <div className="page-head" style={{ margin: 0 }}><h1>{s.title}</h1><p>📊 Live analytics · {s.status === "draft" ? "draft (not collecting yet)" : "collecting responses"}</p></div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button className="btn btn-p" onClick={() => openShare(s)}>↗ Share</button>
          {s.status === "draft" && <Link className="btn btn-g" href={`/builder/${id}`}>✏️ Edit</Link>}
          <button className="btn btn-g" onClick={exportCSV}>⬇ CSV</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat"><div className="v">{completed}</div><div className="l">Total responses</div></div>
        <div className="card stat"><div className="v">{avgDur ? Math.round(avgDur / 1000) + "s" : "—"}</div><div className="l">Avg completion time</div></div>
        <div className="card stat"><div className="v">{s.shares || 0}</div><div className="l">Shares</div></div>
        <div className="card stat"><div className="v">{conv}%</div><div className="l">View → response</div></div>
      </div>

      <div className="card card-p" style={{ marginBottom: "1.6rem" }}>
        <b>Responses — last 7 days</b>
        <Sparkline points={perDay} />
        <div style={{ display: "flex", justifyContent: "space-between" }} className="tiny muted">
          <span>{days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <span>{days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>Question breakdown</h2>
      <p className="tiny muted" style={{ marginTop: "-.6rem", marginBottom: "1rem" }}>
        Each choice shows its response count and share of answers. Star-rating questions include the average score and rating distribution.
      </p>
      {ag.map((a, i) => {
        const skipped = completed - a.total, head = <b>{i + 1}. {a.q.text}</b>;
        if (a.counts) return (
          <div key={a.q.id} className="card card-p" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              {head}
              <span className="tiny muted">{a.total} {a.total === 1 ? "answer" : "answers"} · most picked: <b>{a.total && a.counts[0] ? a.counts[0][0] : "—"}</b>{skipped ? ` · ${skipped} skipped` : ""}</span>
            </div>
            <div style={{ marginTop: ".8rem" }}><BarsHTML a={a} /></div>
          </div>
        );
        if (a.avg != null) {
          const sc = a.q.type === "nps" ? 10 : 5;
          return (
            <div key={a.q.id} className="card card-p" style={{ marginBottom: "1rem" }}>
              {head}
              <div className="tiny muted" style={{ marginTop: ".5rem" }}>{a.total} {a.q.type === "rating" ? (a.total === 1 ? "rating" : "ratings") : (a.total === 1 ? "response" : "responses")}{skipped ? ` · ${skipped} skipped` : ""}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: "2rem", fontWeight: 800, margin: ".3rem 0" }}>
                {a.q.type === "rating" && <span className="tiny muted">Average rating </span>}
                {a.total ? a.avg.toFixed(1) : "—"}<span className="tiny muted"> / {sc}</span>{" "}
                {a.q.type === "nps" && <span className="chip">{a.avg >= 9 ? "🌟 Promoters" : a.avg >= 7 ? "🙂 Passive" : "⚠️ Detractors"}</span>}
              </div>
              <Distr a={a} />
            </div>
          );
        }
        const top = topWords(a.texts, 8);
        return (
          <div key={a.q.id} className="card card-p" style={{ marginBottom: "1rem" }}>
            {head}
            <p className="tiny muted" style={{ margin: ".4rem 0" }}>{a.texts.length} answers{skipped ? ` · ${skipped} skipped` : ""}</p>
            {top.length > 0 && <div className="tag-cloud">{top.map(([w, n]) => <span key={w} className="chip">#{w} · {n}</span>)}</div>}
            {a.texts.slice(0, 4).map((t, k) => <p key={k} className="quote">"{t}"</p>)}
          </div>
        );
      })}
      <p className="tiny muted" style={{ marginTop: "1.4rem" }}>💡 Phase 3: sentiment analysis, AI summaries, drop-off funnels & export to Excel/PDF.</p>
    </div>
  );
}
