"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { useAsync } from "@/lib/hooks";
import { SURVEY_SEL, cnt, loadCounts, q, reg } from "@/lib/data";
import { sb } from "@/lib/supabase";
import SurveyCard from "@/components/SurveyCard";
import { Fail, Loading } from "@/components/Ui";

function BioModal({ onSaved }) {
  const { session, closeModal, toast, setBio } = useApp();
  const [bio, setBioText] = useState(session.bio || "");
  async function save() {
    const b = bio.trim().slice(0, 160);
    try {
      await q(sb.from("profiles").update({ bio: b }).eq("id", session.id));
      setBio(b); closeModal(); toast("Bio updated"); onSaved();
    } catch (e) { toast(e.message); }
  }
  return (
    <>
      <h3>Edit your bio</h3>
      <div style={{ marginTop: "1rem" }}>
        <textarea rows={3} maxLength={160} placeholder="Tell people what you make…" value={bio} onChange={(e) => setBioText(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1.2rem" }}>
        <button className="btn btn-g" onClick={closeModal}>Cancel</button>
        <button className="btn btn-p" onClick={save}>Save</button>
      </div>
    </>
  );
}

export default function Profile() {
  const params = useParams();
  let name = params.name;
  try { name = decodeURIComponent(name); } catch (e) {}
  const { session, ready, toast, authModal, openModal, signOut } = useApp();

  const { data, loading, error, reload } = useAsync(async () => {
    const u = await q(sb.from("profiles").select("id,username,bio").eq("username", name).maybeSingle());
    if (!u) return { missing: true };
    const rows = await q(sb.from("surveys").select(SURVEY_SEL).eq("owner_id", u.id).eq("status", "published").order("created_at", { ascending: false }));
    await loadCounts();
    const fol = await q(sb.from("follows").select("follower_id").eq("followee_id", u.id));
    return { u, pub: reg(rows), fol };
  }, [name, ready, session && session.id]);

  if (loading || !ready) return <Loading />;
  if (error) return <Fail error={error} onRetry={reload} />;
  if (data.missing) return <div className="wrap page"><div className="card empty"><div className="big">🕵️</div>No creator named @{name}.</div></div>;

  const { u, pub, fol } = data;
  const resp = pub.reduce((n, s) => n + cnt(s.id), 0);
  const isMe = session && session.id === u.id;
  const isFollowing = session && !isMe && fol.some((f) => f.follower_id === session.id);

  async function toggleFollow() {
    if (!session) return authModal("in");
    try {
      if (isFollowing) await q(sb.from("follows").delete().eq("follower_id", session.id).eq("followee_id", u.id));
      else { await q(sb.from("follows").insert({ follower_id: session.id, followee_id: u.id })); toast(`Following @${u.username} 🎉`); }
      reload();
    } catch (e) { toast(e.message); }
  }

  return (
    <div className="wrap page" style={{ maxWidth: 780 }}>
      <div className="card profile-head">
        <div className="avatar">{u.username[0] || "?"}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: "1.7rem" }}>@{u.username}</h2>
          <p className="muted small">{u.bio || "EzeeTik creator"}</p>
          <div style={{ display: "flex", gap: "1.2rem", marginTop: ".5rem", color: "var(--muted)", fontSize: ".85rem", flexWrap: "wrap" }}>
            <span><b style={{ color: "var(--ink)" }}>{fol.length}</b> followers</span>
            <span><b style={{ color: "var(--ink)" }}>{pub.length}</b> surveys</span>
            <span><b style={{ color: "var(--ink)" }}>{resp}</b> responses</span>
          </div>
        </div>
        {isMe ? (
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button className="btn btn-g btn-s" onClick={() => openModal(<BioModal onSaved={reload} />)}>✏️ Edit bio</button>
            <button className="btn btn-g btn-s" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <button className={`btn ${isFollowing ? "btn-g" : "btn-p"}`} onClick={toggleFollow}>{isFollowing ? "✓ Following" : "+ Follow"}</button>
        )}
      </div>
      <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>Surveys by @{u.username}</h2>
      {pub.length
        ? <div className="survey-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>{pub.map((s) => <SurveyCard key={s.id} s={s} />)}</div>
        : <div className="card empty"><div className="big">📭</div>No public surveys yet.</div>}
    </div>
  );
}
