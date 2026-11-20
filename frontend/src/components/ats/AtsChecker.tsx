"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { CvSource } from "@/components/cv/CvSource";
import { ApiError } from "@/lib/api";
import { checkResume } from "@/lib/ats/rules";
import type { AtsResult } from "@/lib/ats/types";
import { snapshotOf, type CvSourceValue } from "@/lib/cv-source";
import { extractionToData } from "@/lib/upload/convert";
import { createResumeFromExtraction, EmptyCvError } from "@/lib/upload/import";

import { KeywordCheck } from "./KeywordCheck";
import { ResultView } from "./ResultView";
import { WritingReview } from "./WritingReview";

/** The rules run in the browser, so the result is worked out as soon as there is a CV: no waiting, no AI. */
function resultFor(source: CvSourceValue): AtsResult {
  if (source.kind === "saved") {
    const { doc } = source;
    return checkResume({ data: doc.data, templateId: doc.templateId, design: doc.design });
  }
  const { response } = source;
  return checkResume({
    data: extractionToData(response.cv).data,
    file: { meta: response.meta, findings: response.findings },
  });
}

function Checker() {
  const router = useRouter();
  const [source, setSource] = useState<CvSourceValue | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => (source ? resultFor(source) : null), [source]);
  const snapshot = useMemo(() => (source ? snapshotOf(source) : null), [source]);

  async function importIntoBuilder(file: Extract<CvSourceValue, { kind: "file" }>) {
    setImporting(true);
    setError(null);
    try {
      const id = await createResumeFromExtraction(file.response.cv, { fileName: file.fileName, demo: file.response.demo });
      router.push(`/editor/${id}`);
    } catch (e) {
      setImporting(false);
      setError(e instanceof ApiError || e instanceof EmptyCvError ? e.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">ATS checker</h1>
      <p className="mt-2 text-slate-600">
        Many employers use an applicant tracking system (ATS) that reads your CV before a person does. Check whether
        yours can be read, and what to fix. You can check one of your resumes here, or any CV file you already have.
      </p>

      <div className="mt-6">
        <CvSource value={source} onChange={setSource} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {source && result && snapshot && (
        <>
          <ResultView result={result} fromFile={source.kind === "file"} />

          <div className="mt-6 flex flex-wrap gap-3">
            {source.kind === "saved" ? (
              <Link
                href={`/editor/${source.id}`}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
              >
                Open “{source.title || "Untitled resume"}” in the editor
              </Link>
            ) : (
              <button
                type="button"
                disabled={importing}
                onClick={() => void importIntoBuilder(source)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                {importing ? "Importing…" : "Import into the builder"}
              </button>
            )}
          </div>
          {source.kind === "saved" && (
            <p className="mt-2 text-xs text-slate-500">After you change something, press “Reload after editing” above.</p>
          )}

          <WritingReview key={`review:${snapshotKey(source)}`} snapshot={snapshot} />
          <KeywordCheck key={`keywords:${snapshotKey(source)}`} source={source} />
        </>
      )}
    </main>
  );
}

/** A new CV gets fresh AI sections instead of showing the last one's answers. */
function snapshotKey(source: CvSourceValue): string {
  return source.kind === "saved" ? `saved:${source.id}` : `file:${source.fileName}`;
}

export function AtsChecker() {
  return (
    <RequireAuth>
      <Checker />
    </RequireAuth>
  );
}
