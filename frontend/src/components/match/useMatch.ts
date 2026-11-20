"use client";

import { useMemo, useState } from "react";

import { aiApi, ApiError } from "@/lib/api";
import { keyOf, snapshotOf, type CvSourceValue } from "@/lib/cv-source";
import { jdProblem } from "@/lib/jd";
import { fingerprint, readMatch, saveMatch } from "@/lib/match/session";
import type { Language, MatchAnalysis } from "@/lib/match/types";

/**
 * Runs the shared analysis (PRD JM-07) and remembers it for the browser session. A result is only shown for the CV
 * text and job description it was made for, so editing either clears it. Anything already made in this session by
 * another tool (the ATS keyword check, Job match) is picked up without asking the AI again.
 */
export function useMatch(value: CvSourceValue | null, jd: string, language?: Language) {
  const [fresh, setFresh] = useState<{ cvKey: string; jdKey: string; analysis: MatchAnalysis } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cvKey = useMemo(() => (value ? keyOf(value) : null), [value]);
  const jdKey = useMemo(() => fingerprint(jd.trim()), [jd]);
  const usable = !!cvKey && jdProblem(jd) === null;

  const cached = useMemo(() => (usable && cvKey ? readMatch(cvKey, jdKey, language) : null), [usable, cvKey, jdKey, language]);
  // A result just made for this CV and job description wins; otherwise one kept from earlier in the session.
  const analysis = fresh && fresh.cvKey === cvKey && fresh.jdKey === jdKey ? fresh.analysis : cached;

  /** Runs the analysis and returns it (or null if it could not be made). */
  async function run(lang: Language = language ?? "en"): Promise<MatchAnalysis | null> {
    if (!value || !cvKey) return null;
    const problem = jdProblem(jd);
    if (problem) {
      setError(problem);
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await aiApi.jobMatch(snapshotOf(value), jd.trim(), lang);
      saveMatch({ cvKey, jdKey, language: lang, analysis: result });
      setFresh({ cvKey, jdKey, analysis: result });
      return result;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { analysis, busy, error, run, canRun: usable && !busy };
}
