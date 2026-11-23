"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { useAsync, useSurveyTheme } from "@/lib/hooks";
import { SURVEY_SEL, aggregated, q, reg } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { BarsHTML, Distr } from "@/components/ResultBars";
import { Fail, Loading } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default function Peek() {
  const { slug } = useParams();
  const router = useRouter();
  const { openShare } = useApp();
  const { data, loading, error, reload } = useAsync(async () => {
    const row = await q(sb.from("surveys").select(SURVEY_SEL).eq("slug", slug).maybeSingle());
    if (!row) return null;
    const s = reg([row])[0];
    const rows = (await q(sb.rpc("public_responses", { p_survey: s.id }))).map((r) => ({ answers: r.answers || {} }));
    return { s, rows };
  }, [slug]);

  useSurveyTheme(data && data.s.theme);
  useEffect(() => { if (!loading && !error && !data) router.replace("/"); }, [loading, error, data, router]);

  if (loading) return <Loading />;
  if (error) return <Fail error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const { s, rows } = data;
  const ag = aggregated(s, rows, true);

  return (
    <div className="take-wrap">
      <div className="take-head"><Link href={`/s/${s.slug}`} className="muted small">← Back</Link><span className="chip">● Live results</span></div>
      <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-.04em", margin: ".8rem 0 .2rem" }}>How others answered</h2>
      <p className="muted small" style={{ marginBottom: "1.5rem" }}>"{s.title}" · {rows.length} responses</p>
      {ag.map((a, i) => {
        const head = <b>{i + 1}. {a.q.text}</b>;
        if (a.counts) return <div key={a.q.id} className="card card-p" style={{ marginBottom: "1rem" }}>{head}<div style={{ marginTop: ".9rem" }}><BarsHTML a={a} /></div></div>;
        if (a.avg != null) return (
          <div key={a.q.id} className="card card-p" style={{ marginBottom: "1rem" }}>{head}
            <div style={{ fontFamily: "var(--display)", fontSize: "2.2rem", fontWeight: 800, margin: ".4rem 0" }}>{a.avg.toFixed(1)}<span className="tiny muted"> / {a.q.type === "nps" ? 10 : 5}</span></div>
            <Distr a={a} />
          </div>
        );
        return <div key={a.q.id} className="card card-p" style={{ marginBottom: "1rem" }}>{head}<p className="tiny muted" style={{ marginTop: ".5rem" }}>🔒 Written answers are only visible to the survey owner.</p></div>;
      })}
      <div className="card card-p" style={{ textAlign: "center", background: "var(--grad)", color: "#fff", border: "none", padding: "2rem 1.5rem" }}>
        <b style={{ fontFamily: "var(--display)", fontSize: "1.3rem" }}>Think your friends would answer differently? 😄</b>
        <div style={{ marginTop: "1rem" }}>
          <button className="btn btn-lg" style={{ background: "#fff", color: "#15151f" }} onClick={() => openShare(s)}>↗ Challenge them</button>
        </div>
      </div>
    </div>
  );
}
