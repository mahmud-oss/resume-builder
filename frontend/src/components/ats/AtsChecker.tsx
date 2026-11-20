"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProBadge } from "@/components/app/ProBadge";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { buildSnapshot, type Snapshot } from "@/lib/ai/snapshot";
import { aiApi, ApiError, resumeApi, type ResumeSummary } from "@/lib/api";
import { checkResume } from "@/lib/ats/rules";
import { clearCachedFile, readCachedFile, saveCachedFile, type CachedFile } from "@/lib/ats/session";
import type { AtsResult } from "@/lib/ats/types";
import { docFromServer } from "@/lib/resume/doc";
import { getTemplate } from "@/lib/resume/templates";
import { extractionToData, extractionToDoc } from "@/lib/upload/convert";
import { fileProblem, UPLOAD_ACCEPT } from "@/lib/upload/file";
import { createResumeFromExtraction, EmptyCvError } from "@/lib/upload/import";
import { useHydrated } from "@/lib/useHydrated";

import { ResultView } from "./ResultView";
import { WritingReview } from "./WritingReview";

type Source = "saved" | "file";

/** What the page is showing a result for. */
type Checked =
  | { kind: "saved"; id: string; title: string; templateName: string; result: AtsResult; snapshot: Snapshot }
  | { kind: "file"; cached: CachedFile; result: AtsResult; snapshot: Snapshot };

function checkFileResponse(cached: CachedFile): Checked {
  const { response, fileName } = cached;
  const { data } = extractionToData(response.cv);
  const result = checkResume({ data, file: { meta: response.meta, findings: response.findings } });
  const { doc } = extractionToDoc(response.cv, "classic", fileName);
  return { kind: "file", cached, result, snapshot: buildSnapshot(doc) };
}

function Checker() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [source, setSource] = useState<Source>("saved");
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [importing, setImporting] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    resumeApi
      .list()
      .then((list) => {
        if (!alive) return;
        setResumes(list);
        setSelected((cur) => cur || list[0]?.id || "");
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  // A file read earlier in this browser session is shown again without reading it again.
  const cachedFile = useMemo(() => (hydrated ? readCachedFile() : null), [hydrated]);
  const shown: Checked | null = checked ?? (source === "file" && cachedFile ? checkFileResponse(cachedFile) : null);
  const shownForSource = shown && shown.kind === source ? shown : null;

  async function checkSaved(id: string) {
    setError(null);
    setBusy("Checking…");
    try {
      const doc = docFromServer(await resumeApi.get(id));
      const result = checkResume({ data: doc.data, templateId: doc.templateId, design: doc.design });
      setChecked({ kind: "saved", id, title: doc.title, templateName: getTemplate(doc.templateId).name, result, snapshot: buildSnapshot(doc) });
    } catch (e) {
      setChecked(null);
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function checkFile(file: File | undefined) {
    if (!file || busy) return;
    const problem = fileProblem(file);
    if (problem) return setError(problem);
    setError(null);
    setBusy("Reading your CV… this can take up to a minute.");
    try {
      const response = await aiApi.atsFile(file);
      const cached = { fileName: file.name, response };
      saveCachedFile(cached);
      setChecked(checkFileResponse(cached));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function importIntoBuilder(c: Extract<Checked, { kind: "file" }>) {
    setImporting(true);
    setError(null);
    try {
      const id = await createResumeFromExtraction(c.cached.response.cv, { fileName: c.cached.fileName, demo: c.cached.response.demo });
      router.push(`/editor/${id}`);
    } catch (e) {
      setImporting(false);
      setError(e instanceof ApiError || e instanceof EmptyCvError ? e.message : "Something went wrong. Please try again.");
    }
  }

  function chooseAnotherFile() {
    clearCachedFile();
    setChecked(null);
    setError(null);
  }

  const tab = (value: Source, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={source === value}
      onClick={() => {
        setSource(value);
        setError(null);
      }}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${source === value ? "bg-brand text-white" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">ATS checker</h1>
      <p className="mt-2 text-slate-600">
        Many employers use an applicant tracking system (ATS) that reads your CV before a person does. Check whether
        yours can be read, and what to fix. You can check one of your resumes here, or any CV file you already have.
      </p>

      <div role="tablist" aria-label="What to check" className="mt-6 flex gap-2">
        {tab("saved", "One of my resumes")}
        {tab("file", "A CV file")}
      </div>

      {source === "saved" ? (
        <div className="mt-4">
          {resumes === null && !error && <p className="text-slate-500">Loading your resumes…</p>}
          {resumes?.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-slate-600">
              You have no resumes yet.{" "}
              <Link href="/templates" className="font-medium text-brand hover:underline">
                Build one
              </Link>{" "}
              or{" "}
              <Link href="/upload" className="font-medium text-brand hover:underline">
                upload one
              </Link>
              , or check a CV file instead.
            </p>
          )}
          {resumes && resumes.length > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="ats-resume" className="block text-sm font-medium text-slate-700">
                  Resume
                </label>
                <select
                  id="ats-resume"
                  value={selected}
                  disabled={!!busy}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-1 w-72 max-w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title || "Untitled resume"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!selected || !!busy}
                onClick={() => void checkSaved(selected)}
                className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ?? (shownForSource ? "Check again" : "Check")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void checkFile(e.dataTransfer.files?.[0]);
          }}
          className={`mt-4 rounded-lg border-2 border-dashed p-8 text-center transition ${over ? "border-brand bg-blue-50" : "border-slate-300 bg-white"}`}
        >
          {busy ? (
            <p role="status" className="text-slate-700">
              {busy}
            </p>
          ) : shownForSource?.kind === "file" ? (
            <p className="text-slate-700">
              Showing the result for <span className="font-medium">{shownForSource.cached.fileName}</span>.{" "}
              <button type="button" onClick={chooseAnotherFile} className="font-medium text-brand hover:underline">
                Check a different file
              </button>
            </p>
          ) : (
            <>
              <p className="text-slate-700">Drop your CV here, or</p>
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="mt-3 rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90"
              >
                Choose a file
              </button>
              <p className="mt-3 text-xs text-slate-500">PDF or Word (.docx) · up to 4 MB · up to 4 pages</p>
            </>
          )}
          <input ref={input} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => void checkFile(e.target.files?.[0])} />
        </div>
      )}

      {source === "file" && !shownForSource && (
        <p className="mt-3 text-xs text-slate-500">
          Your file is looked at once and not stored. Its text is sent to our AI provider (Anthropic) to read it, and
          kept in this browser tab until you close it.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {shownForSource && (
        <>
          <ResultView result={shownForSource.result} fromFile={shownForSource.kind === "file"} />

          <div className="mt-6 flex flex-wrap gap-3">
            {shownForSource.kind === "saved" ? (
              <Link
                href={`/editor/${shownForSource.id}`}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
              >
                Open “{shownForSource.title || "Untitled resume"}” in the editor
              </Link>
            ) : (
              <button
                type="button"
                disabled={importing}
                onClick={() => void importIntoBuilder(shownForSource)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                {importing ? "Importing…" : "Import into the builder"}
              </button>
            )}
          </div>
          {shownForSource.kind === "saved" && (
            <p className="mt-2 text-xs text-slate-500">After you change something, come back and press Check again.</p>
          )}

          <WritingReview key={shownForSource.kind === "saved" ? shownForSource.id : shownForSource.cached.fileName} snapshot={shownForSource.snapshot} />

          <section aria-label="Keywords for a job" className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-500">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700">
              Check keywords for a job <ProBadge />
            </h2>
            <p className="mt-1 text-sm">
              Paste a job description and see which of its keywords your CV has and which it lacks. This arrives with Job
              match, which is coming soon.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

export function AtsChecker() {
  return (
    <RequireAuth>
      <Checker />
    </RequireAuth>
  );
}
