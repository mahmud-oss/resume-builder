/**
 * The job description the user pasted, kept for the browser session and shared by every tool that needs one
 * (PRD JD-03, JD-06). Pasted text only, at most 10,000 characters, never stored on the server.
 */

export const MAX_JD_CHARS = 10_000;
/** The server needs at least this much to work with. */
export const MIN_JD_CHARS = 20;

const KEY = "rb.jd";

export function readJd(): string {
  try {
    return (sessionStorage.getItem(KEY) ?? "").slice(0, MAX_JD_CHARS);
  } catch {
    return "";
  }
}

export function saveJd(text: string) {
  try {
    if (text.trim() === "") sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, text.slice(0, MAX_JD_CHARS));
  } catch {
    /* storage blocked: the text is kept on this page only */
  }
}

/** Why the text cannot be used yet, or null when it can. */
export function jdProblem(text: string): string | null {
  const t = text.trim();
  if (t.length < MIN_JD_CHARS) return "Please paste the job description (at least a few lines).";
  if (t.length > MAX_JD_CHARS) return `The job description is too long. The limit is ${MAX_JD_CHARS.toLocaleString("en")} characters.`;
  return null;
}
