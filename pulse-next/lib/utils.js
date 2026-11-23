export const uid = () => Math.random().toString(36).slice(2, 9);

export const shortCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};

export const newSlug = () => shortCode().toLowerCase() + uid().slice(0, 3);

export const store = {
  get(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v == null ? d : v;
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  },
};

export const estTime = (s) => Math.max(10, s.questions.length * 12);

export function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  return Math.round(s / 86400) + "d ago";
}

export function formatDeadline(ts) {
  if (!ts) return null;
  const diff = ts - Date.now();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 1) return `${days}d left`;
  if (days === 1) return "1d left";
  if (hours > 0) return `${hours}h left`;
  const mins = Math.max(1, Math.floor((diff % 3600000) / 60000));
  return `${mins}m left`;
}

export const surveyURL = (s) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/s/${s.slug}`;

export const shortURL = (s) => `pulse.to/s/${s.code || s.slug}`;

export function confettiBurst() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const em = ["🎉", "✨", "🎊", "⭐", "💜", "🔥"];
  for (let i = 0; i < 26; i++) {
    const d = document.createElement("div");
    d.className = "confetti";
    d.textContent = em[i % em.length];
    d.style.left = Math.random() * 100 + "vw";
    d.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3600);
  }
}
