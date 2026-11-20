"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProBadge } from "@/components/app/ProBadge";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { CvSource } from "@/components/cv/CvSource";
import { ApiError } from "@/lib/api";
import type { CvSourceValue } from "@/lib/cv-source";
import { jdProblem, readJd } from "@/lib/jd";
import type { Language } from "@/lib/match/types";
import { PRO_HINT } from "@/lib/pro";
import { createResumeFromExtraction, EmptyCvError } from "@/lib/upload/import";

import { JdBox } from "./JdBox";
import { MatchResult } from "./MatchResult";
import { useMatch } from "./useMatch";

function Page() {
  const router = useRouter();
  const [source, setSource] = useState<CvSourceValue | null>(null);
  // Safe to read here: this page only mounts in the browser, after the sign-in check.
  const [jd, setJd] = useState(() => readJd());
  const [language, setLanguage] = useState<Language>("en");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const match = useMatch(source, jd, language);

  async function importIntoBuilder(file: Extract<CvSourceValue, { kind: "file" }>) {
    setImporting(true);
    setImportError(null);
    try {
      const id = await createResumeFromExtraction(file.response.cv, { fileName: file.fileName, demo: file.response.demo });
      router.push(`/editor/${id}`);
    } catch (e) {
      setImporting(false);
      setImportError(e instanceof ApiError || e instanceof EmptyCvError ? e.message : "Something went wrong. Please try again.");
    }
  }

  const problem = jd.trim() === "" ? null : jdProblem(jd);
  const radio = (value: Language, label: string) => (
    <label className="flex items-center gap-1.5 text-sm">
      <input type="radio" name="match-language" checked={language === value} onChange={() => setLanguage(value)} />
      {label}
    </label>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        Job match <ProBadge />
      </h1>
      <p className="mt-1 text-xs text-slate-500">{PRO_HINT}</p>
      <p className="mt-2 text-slate-600">
        Paste a job description and see how well your CV fits it: what it already shows, what the job asks for that it does
        not, and what to do about it. You can use one of your resumes or any CV file.
      </p>

      <div className="mt-6">
        <CvSource value={source} onChange={setSource} />
      </div>

      <div className="mt-6">
        <JdBox value={jd} onChange={setJd} />
        {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">Explain in</legend>
        <div className="mt-1 flex gap-4">
          {radio("en", "English")}
          {radio("bn", "বাংলা")}
        </div>
        <p className="mt-1 text-xs text-slate-500">Only the explanations change. The matching is always done in English.</p>
      </fieldset>

      <button
        type="button"
        disabled={!match.canRun}
        onClick={() => void match.run(language)}
        className="mt-5 rounded-md bg-brand px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {match.busy ? "Matching…" : match.analysis ? "Match again" : "Match my CV"}
      </button>
      {!source && <p className="mt-2 text-sm text-slate-500">Choose a CV first.</p>}

      {(match.error || importError) && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {match.error ?? importError}
        </p>
      )}

      {source && match.analysis && (
        <MatchResult
          analysis={match.analysis}
          source={source}
          importing={importing}
          onImport={() => source.kind === "file" && void importIntoBuilder(source)}
        />
      )}
    </main>
  );
}

export function JobMatch() {
  return (
    <RequireAuth>
      <Page />
    </RequireAuth>
  );
}
