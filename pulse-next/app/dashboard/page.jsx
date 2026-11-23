"use client";
import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { useAsync } from "@/lib/hooks";
import { catMeta } from "@/lib/constants";
import { REG, SURVEY_SEL, cnt, insertSurvey, loadCounts, q, reg, viralScore } from "@/lib/data";
import { formatDeadline } from "@/lib/utils";
import { parseImportedSurvey } from "@/lib/importer";
import { sb } from "@/lib/supabase";
import { Fail, Loading, NeedAuth } from "@/components/Ui";
import { BarChart3, Edit3, Flame, Inbox, Play, Rocket, Share2, Trash2, Upload } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const fileRef = useRef(null);
  const { session, ready, toast, openShare } = useApp();
  const { data: mine, loading, error, reload } = useAsync(async () => {
    if (!session) return null;
    const rows = await q(sb.from("surveys").select(SURVEY_SEL).eq("owner_id", session.id).order("created_at", { ascending: false }));
    await loadCounts();
    return reg(rows);
  }, [session && session.id, ready]);

  if (!ready) return <Loading />;
  if (!session) return <NeedAuth msg="Sign in to see your surveys." />;
  if (error) return <Fail error={error} onRetry={reload} />;
  if (loading || !mine) return <Loading />;

  const allResp = mine.reduce((n, s) => n + cnt(s.id), 0);

  async function del(id) {
    if (!confirm("Delete this survey and all its responses?")) return;
    try { await q(sb.from("surveys").delete().eq("id", id)); delete REG[id]; toast("Survey deleted"); reload(); }
    catch (e) { toast(e.message); }
  }
  async function publish(s) {
    try {
      await q(sb.from("surveys").update({ status: "published", published_at: new Date().toISOString() }).eq("id", s.id));
      s.status = "published";
      toast("Published! 🎉");
      openShare(s);
      reload();
    } catch (e) { toast(e.message); }
  }
  async function importSurveyJSON(e) {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch (err) { toast("The selected file is not valid JSON."); return; }
    try {
      await insertSurvey(session.id, parseImportedSurvey(data));
      toast("Survey imported as a draft.");
      reload();
    } catch (err) { toast(err.message); }
  }

  return (
    <div className="wrap page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.8rem" }}>
        <div className="page-head" style={{ margin: 0 }}><h1>My surveys</h1><p>{mine.length} surveys · {allResp} total responses</p></div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={importSurveyJSON} />
          {/* <button className="btn btn-g" onClick={() => fileRef.current.click()}><Upload size={16} /> Import JSON</button> */}
          <Link className="btn btn-p" href="/create">+ New survey</Link>
        </div>
      </div>
      {mine.length ? (
        <div className="survey-grid">
          {mine.map((s) => {
            const r = cnt(s.id), m = catMeta(s.category);
            return (
              <article key={s.id} className="scard" style={{ cursor: "default" }}>
                <div className="cover" style={{ background: m.bg, height: 92 }}>
                  <span className="cov-hot"><Flame size={12} /> {viralScore(s)}</span>
                  <span className="cov-emoji" style={{ fontSize: "2rem" }}>{m.e}</span>
                  <span className="cov-cat">{s.status === "draft" ? "📝 Draft" : s.status === "published" && s.expiresAt && Date.now() > s.expiresAt ? "🔒 Closed" : "🟢 Live"}</span>
                </div>
                <div className="sbody">
                  <h3 onClick={() => router.push(s.status === "draft" ? `/builder/${s.id}` : `/s/${s.slug}`)} style={{ cursor: "pointer" }}>{s.title}</h3>
                  <div className="by">
                    {s.questions.length} questions · <Play size={13} /> {r} responses · <Share2 size={13} /> {s.shares || 0} shares
                    {s.status === "published" && s.expiresAt && (
                      <span style={{ color: Date.now() > s.expiresAt ? "var(--bad)" : "var(--muted)" }}>
                        {" "}· {Date.now() > s.expiresAt ? "Closed" : `Ends in ${formatDeadline(s.expiresAt)}`}
                      </span>
                    )}
                  </div>
                  <div className="card-actions" style={{ marginTop: "auto" }}>
                    <button className="btn btn-g btn-s" onClick={() => openShare(s)}><Share2 size={14} /> Share</button>
                    <Link className="btn btn-g btn-s" href={`/results/${s.id}`}><BarChart3 size={14} /> Results</Link>
                    {s.status === "draft" && <Link className="btn btn-g btn-s" href={`/builder/${s.id}`}><Edit3 size={14} /> Edit</Link>}
                    {s.status === "draft"
                      ? <button className="btn btn-p btn-s" onClick={() => publish(s)}><Rocket size={14} /> Publish</button>
                      : <Link className="btn btn-k btn-s" href={`/s/${s.slug}`}><Play size={14} /> Open</Link>}
                    <button className="btn btn-d btn-s" onClick={() => del(s.id)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card empty"><div className="big"><Inbox size={38} /></div>No surveys yet.<br /><br /><Link className="btn btn-p" href="/create">Create your first survey →</Link></div>
      )}
    </div>
  );
}
