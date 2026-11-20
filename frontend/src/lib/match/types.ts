/** Job Match's shapes (PRD §11.7). One analysis is shared by the Job match page, the ATS keyword check and Tailor. */

export type MatchBand = "strong" | "good" | "partial" | "low";
export type Language = "en" | "bn";

/** A skill the job asks for that the CV shows, with a quote from the CV as proof. */
export type MatchedSkill = { skill: string; evidence: string };
/** A skill the job asks for that the CV does not show, with the job description's own words. */
export type MissingSkill = { skill: string; importance: "required" | "nice"; jdQuote: string };
export type MatchSuggestion = { text: string; entry: string };

export type MatchAnalysis = {
  band: MatchBand;
  summary: string;
  jobTitle: string;
  company: string;
  matching: MatchedSkill[];
  missing: MissingSkill[];
  suggestions: MatchSuggestion[];
  demo: boolean;
};

export const BAND_NAME: Record<MatchBand, string> = {
  strong: "Strong match",
  good: "Good match",
  partial: "Partial match",
  low: "Low match",
};
