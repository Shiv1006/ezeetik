import { cnt, bumpShares } from "./data";
import { estTime, surveyURL } from "./utils";

/* Draws a shareable PNG card on a canvas and downloads it */
export function downloadCard(s, ratio) {
  const [W, H] = { square: [1080, 1080], story: [1080, 1920], land: [1200, 630] }[ratio] || [1080, 1080];
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#6c47ff"); g.addColorStop(1, "#ff5c8a");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,.14)";
  x.beginPath(); x.arc(W * 0.85, H * 0.12, W * 0.28, 0, 7); x.fill();
  x.beginPath(); x.arc(W * 0.1, H * 0.9, W * 0.22, 0, 7); x.fill();
  x.fillStyle = "#fff"; x.textAlign = "center";
  x.font = `800 ${W * 0.058}px Inter,system-ui,sans-serif`;
  const title = s.title.length > 26 ? s.title.slice(0, 24) + "…" : s.title;
  const ty = H * (ratio === "story" ? 0.32 : 0.42);
  x.fillText(title, W / 2, ty);
  x.font = `600 ${W * 0.034}px Inter,system-ui,sans-serif`; x.fillStyle = "rgba(255,255,255,.92)";
  x.fillText(`🔥 ${s.questions.length} questions   ⏱ ~${estTime(s)} seconds`, W / 2, ty + W * 0.08);
  const r = cnt(s.id);
  if (r > 0) x.fillText(`▶ ${r} people already answered`, W / 2, ty + W * 0.135);
  const pw = W * 0.56, ph = W * 0.11, px = (W - pw) / 2, py = H * (ratio === "story" ? 0.55 : 0.62);
  x.fillStyle = "#fff";
  if (x.roundRect) { x.beginPath(); x.roundRect(px, py, pw, ph, ph / 2); x.fill(); } else x.fillRect(px, py, pw, ph);
  x.fillStyle = "#6c47ff"; x.font = `800 ${W * 0.045}px Inter,system-ui,sans-serif`;
  x.fillText("Take the survey →", W / 2, py + ph * 0.65);
  x.fillStyle = "rgba(255,255,255,.85)"; x.font = `500 ${W * 0.026}px Inter,system-ui,sans-serif`;
  x.fillText(surveyURL(s).replace(/^https?:\/\//, "").slice(0, 60), W / 2, H * 0.93);
  x.font = `800 ${W * 0.04}px Inter,system-ui,sans-serif`; x.fillStyle = "#fff";
  x.fillText("EzeeTik", W / 2, H * 0.07);
  const a = document.createElement("a");
  a.href = cv.toDataURL("image/png");
  a.download = `${s.title.replace(/\W+/g, "-").toLowerCase()}-${ratio}.png`;
  a.click();
  bumpShares(s);
}
