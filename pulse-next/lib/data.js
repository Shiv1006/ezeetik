import { sb } from "./supabase";
import { newSlug, shortCode } from "./utils";
import { MIN_REGULAR_Q } from "./constants";

export const REG = {};    // id -> survey object (all surveys seen so far)
export const COUNTS = {}; // survey id -> response count
export const surveyById = (id) => REG[id];
export const cnt = (id) => COUNTS[id] || 0;

/* run a supabase query and throw on error */
export async function q(p) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export const mapSurvey = (r) => ({
  id: r.id, slug: r.slug, code: r.code, title: r.title, description: r.description || "",
  category: r.category, mode: r.mode, theme: r.theme, status: r.status,
  expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
  questions: Array.isArray(r.questions) ? r.questions : [],
  shares: r.shares || 0, views: r.views || 0,
  createdAt: new Date(r.created_at).getTime(), ownerId: r.owner_id,
  creator: (r.profiles && r.profiles.username) || "unknown",
});

export function reg(rows) {
  return rows.map((r) => { const s = mapSurvey(r); REG[s.id] = s; return s; });
}

export const SURVEY_SEL = "*, profiles(username)";

export function validateSurveyQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < MIN_REGULAR_Q) {
    return `Add at least ${MIN_REGULAR_Q} questions before publishing`;
  }
  const incompleteIndex = questions.findIndex((x) =>
    !x || typeof x.text !== "string" || !x.text.trim() || x.text.trim().toLowerCase() === "untitled question"
  );
  if (incompleteIndex !== -1) return `Enter text for question ${incompleteIndex + 1}`;
  const invalidOptionsIndex = questions.findIndex((x) =>
    x.type === "single" && (!Array.isArray(x.options) || x.options.length < 2 || x.options.some((option) => typeof option !== "string" || !option.trim()))
  );
  if (invalidOptionsIndex !== -1) return `Add at least 2 non-empty options to question ${invalidOptionsIndex + 1}`;
  return null;
}

export async function loadCounts() {
  const rows = await q(sb.from("survey_counts").select("*"));
  rows.forEach((r) => (COUNTS[r.survey_id] = r.response_count));
}

export async function fetchPublished() {
  const rows = await q(sb.from("surveys").select(SURVEY_SEL).eq("status", "published").order("created_at", { ascending: false }).limit(200));
  await loadCounts();
  return reg(rows);
}

export async function fetchAllResponses(id) {
  const out = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    const rows = await q(sb.from("responses").select("id,answers,created_at,duration_ms").eq("survey_id", id).order("created_at", { ascending: false }).range(from, from + step - 1));
    rows.forEach((r) => out.push({ id: r.id, answers: r.answers || {}, ts: new Date(r.created_at).getTime(), dur: r.duration_ms || 0 }));
    if (rows.length < step) break;
    from += step;
    if (from > 20000) break;
  }
  return out;
}

export function bump(id, field) {
  if (!sb) return;
  sb.rpc("bump_survey", { p_id: id, p_field: field }).then(() => {}, () => {});
}

export function bumpShares(s) {
  if (s) s.shares = (s.shares || 0) + 1;
  bump(s.id, "shares");
}

export async function insertSurvey(ownerId, fields) {
  const payload = {
    owner_id: ownerId, slug: newSlug(), code: shortCode(), status: "draft",
    title: fields.title, description: fields.description || "", category: fields.category,
    mode: fields.mode, theme: fields.theme, questions: fields.questions,
  };
  if (fields.expiresAt) {
    payload.expires_at = new Date(fields.expiresAt).toISOString();
  }
  const row = await q(sb.from("surveys").insert(payload).select(SURVEY_SEL).single());
  return reg([row])[0];
}

/* ---------- viral score ---------- */
export function viralScore(s) {
  const r = cnt(s.id), ageH = (Date.now() - s.createdAt) / 3600000;
  const recency = Math.max(0, 48 - ageH) / 48;
  return Math.round(Math.min(99, (r * 0.45 + (s.shares || 0) * 2.2 + recency * 38) / (1 + ageH / 72)));
}

export function trendRank(s) {
  const r = cnt(s.id), ageH = (Date.now() - s.createdAt) / 3600000;
  return r * 3 + (s.shares || 0) * 5 + Math.max(0, 48 - ageH) * 2 - r * ageH * 0.05;
}

/* ---------- aggregation ---------- */
export function aggregated(s, rows, isPublic) {
  return s.questions.map((x) => {
    const vals = rows.map((r) => r.answers[x.id]).filter((v) => v != null);
    const out = { q: x, total: vals.length };
    if (["single", "yesno", "dropdown", "multi"].includes(x.type)) {
      const options = x.type === "yesno" ? ["Yes", "No"] : Array.isArray(x.options) ? x.options : [];
      const counts = Object.fromEntries([...new Set(options)].map((option) => [option, 0]));
      vals.forEach((v) => {
        if (Array.isArray(v)) v.forEach((o) => (counts[o] = (counts[o] || 0) + 1));
        else counts[v] = (counts[v] || 0) + 1;
      });
      out.counts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    } else if (x.type === "rating" || x.type === "nps") {
      const nums = vals.map(Number).filter((n) => !isNaN(n));
      out.total = nums.length;
      out.avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      out.distr = {};
      nums.forEach((n) => (out.distr[n] = (out.distr[n] || 0) + 1));
    } else {
      out.texts = vals.map(String);
      out.private = !!isPublic;
    }
    return out;
  });
}

const STOP = ["this", "that", "with", "from", "have", "were", "they", "very", "just", "about"];
export function topWords(texts, n) {
  const w = {};
  texts.join(" ").toLowerCase().replace(/[^\w\s']/g, "").split(/\s+/).forEach((x) => {
    if (x.length > 3 && !STOP.includes(x)) w[x] = (w[x] || 0) + 1;
  });
  return Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, n);
}
