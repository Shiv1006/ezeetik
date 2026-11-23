import { uid } from "./utils";

export const CATEGORIES = ["Technology","Education","Business","Customer Feedback","Product Research","Employee Feedback","Healthcare","Lifestyle","Entertainment","Sports","Gaming","Politics","Travel","Food","Relationships","Personality","Psychology","Finance","Fashion","Movies","Music","Social Issues","Academic Research","Market Research","General Polls","Fun","Quizzes","Trending"];

export const CAT_EMOJI = {Technology:"💻",Education:"🎓",Business:"💼","Customer Feedback":"💬","Product Research":"🧪","Employee Feedback":"🤝",Healthcare:"🩺",Lifestyle:"🌿",Entertainment:"🎭",Sports:"⚽",Gaming:"🎮",Politics:"🗳️",Travel:"✈️",Food:"🍜",Relationships:"💞",Personality:"🪞",Psychology:"🧠",Finance:"💰",Fashion:"👗",Movies:"🎬",Music:"🎧","Social Issues":"🌍","Academic Research":"📚","Market Research":"📈","General Polls":"🗨️",Fun:"🎉",Quizzes:"🎯",Trending:"🔥"};

export function catMeta(c) {
  const i = Math.max(0, CATEGORIES.indexOf(c));
  const h = (i * 47 + 250) % 360;
  return { e: CAT_EMOJI[c] || "✨", bg: `linear-gradient(135deg,hsl(${h} 85% 60%),hsl(${(h + 45) % 360} 90% 56%))` };
}

export const QUESTION_TYPES = {
  single:   { label: "Single choice",   icon: "circle",       hasOptions: true },
  multi:    { label: "Multiple choice", icon: "check",        hasOptions: true },
  yesno:    { label: "Yes / No",        icon: "check",        hasOptions: false },
  dropdown: { label: "Dropdown",        icon: "chevronDown",  hasOptions: true },
  text:     { label: "Short text",      icon: "text",         hasOptions: false },
  longtext: { label: "Long text",       icon: "text",         hasOptions: false },
  rating:   { label: "Star rating",     icon: "star",         hasOptions: false },
  nps:      { label: "NPS (0–10)",      icon: "bars",         hasOptions: false },
  number:   { label: "Number",          icon: "hash",         hasOptions: false },
  email:    { label: "Email",           icon: "mail",         hasOptions: false },
};

export const THEMES = [["th-royal","#6c47ff"],["th-ocean","#0a84ff"],["th-sunset","#ff4d6d"],["th-forest","#0f9d6b"],["th-minimal","#2b2b3d"],["th-dark","#a78bfa"]];

export const MAX_Q = 100; // matches the DB check constraint
export const MIN_REGULAR_Q = 3;
export const MAX_REGULAR_Q = 10;
export const REGULAR_QUESTION_TYPES = ["single", "yesno", "rating"];

export function newQuestion(type) {
  const x = { id: uid(), type, text: "", required: true, options: [] };
  if (QUESTION_TYPES[type].hasOptions) x.options = ["Option 1", "Option 2"];
  return x;
}
