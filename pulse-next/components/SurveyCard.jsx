"use client";
import { useRouter } from "next/navigation";
import { catMeta } from "@/lib/constants";
import { cnt, viralScore } from "@/lib/data";
import { estTime, formatDeadline, timeAgo } from "@/lib/utils";
import { Clock, Flame, Play, Share2 } from "lucide-react";

export default function SurveyCard({ s }) {
  const router = useRouter();
  const r = cnt(s.id), m = catMeta(s.category);
  return (
    <article className="scard" onClick={() => router.push(`/s/${s.slug}`)}>
      <div className="cover" style={{ background: m.bg }}>
        <span className="cov-hot"><Flame size={12} /> {viralScore(s)}</span>
        <span className="cov-emoji"><span className="category-icon">{m.e}</span></span>
        <span className="cov-cat">{s.category}</span>
      </div>
      <div className="sbody">
        <h3>{s.title}</h3>
        <div className="by">
          <i className="av">{(s.creator || "?")[0]}</i><span>@{s.creator}</span>
          <span>· {s.questions.length} questions · ~{estTime(s)}s</span>
        </div>
        <div className="stats">
          <span><Play size={13} /> {r} responses</span><span><Share2 size={13} /> {s.shares || 0} shares</span>
          {s.status === "published" && s.expiresAt && (
            <span className="chip" style={{ fontSize: ".72rem", padding: ".15rem .5rem", color: Date.now() > s.expiresAt ? "var(--bad)" : "var(--muted)" }}>
              <Clock size={11} /> {formatDeadline(s.expiresAt)}
            </span>
          )}
          <span style={{ marginLeft: "auto" }}>{timeAgo(s.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
