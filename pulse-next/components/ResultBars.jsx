export function BarsHTML({ a }) {
  if (!a.total) return <p className="tiny muted">No answers yet</p>;
  return a.counts.map(([o, n]) => {
    const p = a.total ? Math.round((n / a.total) * 100) : 0;
    return (
      <div className="rbar" key={o}>
        <div className="lbl"><span>{o} · {n} {n === 1 ? "response" : "responses"}</span><b>{p}%</b></div>
        <div className="track" role="progressbar" aria-label={`${o}: ${p}%`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
          <div className="fill" style={{ width: p + "%" }} />
        </div>
      </div>
    );
  });
}

export function Distr({ a }) {
  if (!a.total) return <p className="tiny muted">No ratings yet</p>;
  return Object.entries(a.distr).sort((x, y) => x[0] - y[0]).map(([k, n]) => (
    <div className="rbar" key={k}>
      <div className="lbl"><span>{a.q.type === "nps" ? "Score " + k : k + " ★"} · {n} {n === 1 ? "rating" : "ratings"}</span><b>{Math.round((n / a.total) * 100)}%</b></div>
      <div className="track" role="progressbar" aria-label={`${k}: ${Math.round((n / a.total) * 100)}%`} aria-valuenow={Math.round((n / a.total) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="fill" style={{ width: Math.round((n / a.total) * 100) + "%" }} />
      </div>
    </div>
  ));
}

export function Sparkline({ points }) {
  if (points.length < 2) return <p className="tiny muted">Not enough data yet</p>;
  const w = 560, h = 100, max = Math.max(...points, 1);
  const pts = points.map((p, i) => `${((i / (points.length - 1)) * w).toFixed(1)},${(h - 8 - (p / max) * (h - 20)).toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent1)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--accent1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke="var(--accent1)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
