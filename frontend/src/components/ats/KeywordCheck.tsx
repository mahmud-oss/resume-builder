"use client";

import { useState } from "react";

import { ProBadge } from "@/components/app/ProBadge";
import { JdBox } from "@/components/match/JdBox";
import { KeywordLists } from "@/components/match/KeywordLists";
import { useMatch } from "@/components/match/useMatch";
import type { CvSourceValue } from "@/lib/cv-source";
import { jdProblem, readJd } from "@/lib/jd";

/**
 * The ATS checker's keyword check (PRD ATS-03, ATS-10): with a job description, which of the job's keywords the CV
 * has and lacks. It uses the same analysis as Job match, so the two always agree and one is reused for the other.
 */
export function KeywordCheck({ source }: { source: CvSourceValue }) {
  // Safe to read here: this page only mounts in the browser, after the sign-in check.
  const [jd, setJd] = useState(() => readJd());
  const match = useMatch(source, jd);
  const problem = jd.trim() === "" ? null : jdProblem(jd);

  return (
    <section aria-label="Check keywords for a job" className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        Check keywords for a job <ProBadge />
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Optional. Paste a job description to see which of its keywords your CV has and which it lacks. Adding one gives a
        keyword check; without one you get the general check above.
      </p>
      <div className="mt-3">
        <JdBox id="ats-jd" value={jd} onChange={setJd} />
        {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
      </div>
      <button
        type="button"
        disabled={!match.canRun}
        onClick={() => void match.run("en")}
        className="mt-3 rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {match.busy ? "Checking…" : match.analysis ? "Check again" : "Check keywords"}
      </button>
      {match.error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {match.error}
        </p>
      )}
      {match.analysis && <KeywordLists analysis={match.analysis} />}
    </section>
  );
}
