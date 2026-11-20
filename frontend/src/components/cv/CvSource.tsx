"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { aiApi, ApiError, resumeApi, type ResumeSummary } from "@/lib/api";
import type { CvSourceValue } from "@/lib/cv-source";
import { clearCachedFile, readCachedFile, saveCachedFile } from "@/lib/ats/session";
import { docFromServer } from "@/lib/resume/doc";
import { fileProblem, UPLOAD_ACCEPT } from "@/lib/upload/file";

type Tab = "saved" | "file";

/**
 * Lets the user pick the CV a tool will work on: one of their saved resumes, or a PDF/Word file. An uploaded file
 * is read by the AI once and kept in this browser tab, so every tool can use it without reading it again.
 */
export function CvSource({ value, onChange }: { value: CvSourceValue | null; onChange: (v: CvSourceValue | null) => void }) {
  const [tab, setTab] = useState<Tab>("saved");
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function loadSaved(id: string) {
    setError(null);
    try {
      const doc = docFromServer(await resumeApi.get(id));
      onChange({ kind: "saved", id, title: doc.title, doc });
    } catch (e) {
      onChange(null);
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  }

  useEffect(() => {
    let alive = true;
    resumeApi
      .list()
      .then((list) => {
        if (!alive) return;
        setResumes(list);
        const first = list[0]?.id ?? "";
        setSelected(first);
        if (first) void loadSaved(first);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // Runs once; loadSaved only reads onChange, which the parent keeps stable enough for a one-time load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseTab(next: Tab) {
    setTab(next);
    setError(null);
    if (next === "saved") {
      if (selected) void loadSaved(selected);
      else onChange(null);
    } else {
      const cached = readCachedFile();
      onChange(cached ? { kind: "file", fileName: cached.fileName, response: cached.response } : null);
    }
  }

  async function readFile(file: File | undefined) {
    if (!file || busy) return;
    const problem = fileProblem(file);
    if (problem) return setError(problem);
    setError(null);
    setBusy("Reading your CV… this can take up to a minute.");
    try {
      const response = await aiApi.atsFile(file);
      saveCachedFile({ fileName: file.name, response });
      onChange({ kind: "file", fileName: file.name, response });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  function chooseAnotherFile() {
    clearCachedFile();
    onChange(null);
    setError(null);
  }

  const tabButton = (t: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => chooseTab(t)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-brand text-white" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div role="tablist" aria-label="Which CV" className="flex gap-2">
        {tabButton("saved", "One of my resumes")}
        {tabButton("file", "A CV file")}
      </div>

      {tab === "saved" ? (
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
              , or use a CV file instead.
            </p>
          )}
          {resumes && resumes.length > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="cv-resume" className="block text-sm font-medium text-slate-700">
                  Resume
                </label>
                <select
                  id="cv-resume"
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    void loadSaved(e.target.value);
                  }}
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
                onClick={() => void loadSaved(selected)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Reload after editing
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
            void readFile(e.dataTransfer.files?.[0]);
          }}
          className={`mt-4 rounded-lg border-2 border-dashed p-8 text-center transition ${over ? "border-brand bg-blue-50" : "border-slate-300 bg-white"}`}
        >
          {busy ? (
            <p role="status" className="text-slate-700">
              {busy}
            </p>
          ) : value?.kind === "file" ? (
            <p className="text-slate-700">
              Using <span className="font-medium">{value.fileName}</span>.{" "}
              <button type="button" onClick={chooseAnotherFile} className="font-medium text-brand hover:underline">
                Use a different file
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
          <input ref={input} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
        </div>
      )}

      {tab === "file" && value?.kind !== "file" && !busy && (
        <p className="mt-3 text-xs text-slate-500">
          Your file is looked at once and not stored. Its text is sent to our AI provider (Anthropic) to read it, and kept
          in this browser tab until you close it.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
