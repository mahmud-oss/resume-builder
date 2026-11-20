import type { Language, MatchAnalysis } from "./types";

/**
 * The latest analysis is kept for the browser session, so the ATS keyword check, the Job match page and Tailor
 * show the same result without paying for it twice. It is only reused when it was made for the same CV text and
 * the same job description (so editing either gives a fresh analysis). Session storage only: never sent anywhere.
 */

const KEY = "rb.match";

/** A short stable fingerprint of some text. Not a security feature, just a cache key. */
export function fingerprint(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ":" + text.length;
}

export type CachedMatch = { cvKey: string; jdKey: string; language: Language; analysis: MatchAnalysis };

export function saveMatch(entry: CachedMatch) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    /* storage blocked or full: the analysis will simply be made again */
  }
}

/** The kept analysis if it is for this CV and job description (and language, when one is asked for). */
export function readMatch(cvKey: string, jdKey: string, language?: Language): MatchAnalysis | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<CachedMatch>;
    if (v.cvKey !== cvKey || v.jdKey !== jdKey || !v.analysis || typeof v.analysis !== "object") return null;
    if (language && v.language !== language) return null;
    return v.analysis;
  } catch {
    return null;
  }
}

export function clearMatch() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
