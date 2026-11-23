import { QUESTION_TYPES, CATEGORIES, THEMES, MAX_Q } from "./constants";
import { uid } from "./utils";

export function importedQuestionList(data) {
  const source = data && typeof data === "object" && data.survey && typeof data.survey === "object" ? data.survey : data;
  const list = Array.isArray(source) ? source : source && typeof source === "object" ? source.questions : null;
  if (!Array.isArray(list) || !list.length) throw new Error("JSON must contain a non-empty questions array.");
  return list;
}

export function parseImportedQuestions(data) {
  const typeMap = { single_choice: "single", multiple_choice: "multi", long_text: "longtext", emoji_rating: "rating", ranking: "multi" };
  return importedQuestionList(data).map((x) => {
    if (!x || typeof x !== "object" || Array.isArray(x) || typeof x.type !== "string") throw new Error("The file contains an unsupported question type.");
    const type = typeMap[x.type] || x.type;
    if (!Object.prototype.hasOwnProperty.call(QUESTION_TYPES, type)) throw new Error("The file contains an unsupported question type.");
    const text = typeof x.text === "string" ? x.text : x.question;
    if (typeof text !== "string") throw new Error("Each question must have text.");
    const options = x.options === undefined ? [] : x.options;
    if (!Array.isArray(options) || options.some((o) => typeof o !== "string")) throw new Error("Question options must be a list of strings.");
    if (QUESTION_TYPES[type].hasOptions && options.length < 2) throw new Error("Choice questions must have at least two options.");
    return { id: uid(), type, text, required: x.required !== false, options: QUESTION_TYPES[type].hasOptions ? [...options] : [] };
  });
}

/* Validate a whole exported survey (dashboard import) and return insertable fields */
export function parseImportedSurvey(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("JSON must contain an exported survey object.");
  const source = data.survey && typeof data.survey === "object" ? data.survey : data;
  if (typeof source.title !== "string" || !source.title.trim()) throw new Error("The survey must have a title.");
  const questions = parseImportedQuestions(source);
  if (questions.length > MAX_Q) throw new Error(`A survey can have at most ${MAX_Q} questions.`);
  return {
    title: source.title.trim().slice(0, 200),
    description: typeof source.description === "string" ? source.description.slice(0, 1000) : "",
    category: CATEGORIES.includes(source.category) ? source.category : source.category === "Food & Lifestyle" ? "Food" : "General Polls",
    mode: source.mode === "professional" ? "professional" : "social",
    theme: THEMES.map((t) => t[0]).includes(source.theme) ? source.theme : "th-royal",
    questions,
  };
}
