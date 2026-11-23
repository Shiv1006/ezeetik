"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAsync } from "@/lib/hooks";
import { CATEGORIES } from "@/lib/constants";
import { cnt, fetchPublished, q, trendRank } from "@/lib/data";
import { sb } from "@/lib/supabase";
import SurveyCard from "@/components/SurveyCard";
import { Fail, Loading } from "@/components/Ui";

export default function Discover() {
  const router = useRouter();
  const [tab, setTab] = useState("trending");
  const [query, setQuery] = useState("");
  const { data, loading, error, reload } = useAsync(async () => {
    const [pub, profiles, follows] = await Promise.all([
      fetchPublished(),
      q(sb.from("profiles").select("id,username,bio")),
      q(sb.from("follows").select("followee_id")),
    ]);
    return { pub, profiles, follows };
  }, []);

  if (loading) return <Loading />;
  if (error) return <Fail error={error} onRetry={reload} />;

  const { pub, profiles, follows } = data;
  const ql = query.toLowerCase();
  const match = (s) => !ql || s.title.toLowerCase().includes(ql) || s.category.toLowerCase().includes(ql) || s.creator.toLowerCase().includes(ql);
  let list = pub.filter(match);
  if (tab === "trending") list = [...list].sort((a, b) => trendRank(b) - trendRank(a));
  if (tab === "new") list = [...list].sort((a, b) => b.createdAt - a.createdAt);
  if (tab === "popular") list = [...list].sort((a, b) => cnt(b.id) - cnt(a.id));
  if (tab === "quizzes") list = list.filter((s) => s.category === "Quizzes" || s.category === "Fun");

  const stat = (u) => {
    const ss = pub.filter((s) => s.ownerId === u.id);
    return { ss, resp: ss.reduce((n, s) => n + cnt(s.id), 0), fol: follows.filter((f) => f.followee_id === u.id).length };
  };
  const creators = profiles.map((u) => ({ u, ...stat(u) })).filter((c) => c.ss.length).sort((a, b) => b.resp - a.resp).slice(0, 3);
  const TABS = [["trending", "🔥 Trending"], ["new", "🆕 New"], ["popular", "⭐ Popular"], ["quizzes", "🎯 Quizzes"]];

  return (
    <div className="wrap page">
      <div className="page-head"><h1>Discover surveys</h1><p>Vote, share, follow creators — surveys spread when they're interesting.</p></div>
      <div className="searchbar">
        <input placeholder="🔍  Search personality quiz, customer feedback, tech poll…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={CATEGORIES.includes(query) ? query : ""} onChange={(e) => setQuery(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="tabs">
        {TABS.map((t) => <button key={t[0]} className={`tab ${tab === t[0] ? "on" : ""}`} onClick={() => setTab(t[0])}>{t[1]}</button>)}
      </div>
      {list.length
        ? <div className="survey-grid">{list.map((s) => <SurveyCard key={s.id} s={s} />)}</div>
        : <div className="card empty"><div className="big">🔍</div>No surveys match. <Link href="/create" style={{ color: "var(--accent1)", fontWeight: 700 }}>Create one!</Link></div>}
      {creators.length > 0 && (
        <>
          <h2 style={{ margin: "3rem 0 1.1rem", fontSize: "1.6rem" }}>Top creators</h2>
          <div className="creators">
            {creators.map((c) => (
              <div key={c.u.id} className="card creator" onClick={() => router.push(`/profile/${encodeURIComponent(c.u.username)}`)}>
                <div style={{ display: "flex", gap: ".9rem", alignItems: "center" }}>
                  <div className="avatar" style={{ width: 50, height: 50, fontSize: "1.15rem", borderRadius: 16 }}>{c.u.username[0] || "?"}</div>
                  <div><b>@{c.u.username}</b><div className="muted tiny">{c.u.bio || "Creator"}</div></div>
                </div>
                <div className="stats" style={{ marginTop: 0 }}><span>{c.ss.length} surveys</span><span>▶ {c.resp} responses</span><span>{c.fol} followers</span></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
