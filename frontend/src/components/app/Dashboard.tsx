"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { resumeApi, type ResumeSummary } from "@/lib/api";
import { getTemplate } from "@/lib/resume/templates";
import { groupVersions } from "@/lib/tailor/group";

function List() {
  const [items, setItems] = useState<ResumeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    resumeApi
      .list()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function remove(r: ResumeSummary) {
    if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    try {
      await resumeApi.remove(r.id);
      setItems((prev) => prev?.filter((x) => x.id !== r.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // One resume's row. A tailored version says what it was made for, and that it is a version.
  const row = (r: ResumeSummary, version: boolean) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <Link href={`/editor/${r.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{r.title || "Untitled resume"}</span>
          {version && <span className="shrink-0 rounded bg-blue-100 px-1.5 py-px text-[10px] font-semibold uppercase leading-4 text-blue-800">Tailored</span>}
        </div>
        <div className="text-sm text-slate-500">
          {getTemplate(r.templateId).name} · edited {new Date(r.updatedAt).toLocaleString()}
        </div>
      </Link>
      <Link href={`/editor/${r.id}`} className="text-sm font-medium text-brand hover:underline">
        Edit
      </Link>
      <button onClick={() => remove(r)} className="text-sm text-red-700 hover:underline">
        Delete
      </button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My resumes</h1>
        <div className="flex items-center gap-2">
          <Link href="/upload" className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50">
            Upload a CV
          </Link>
          <Link href="/templates" className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90">
            New resume
          </Link>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {items === null && !error && <p className="mt-6 text-slate-500">Loading…</p>}
      {items?.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">You have no resumes yet.</p>
          <Link href="/templates" className="mt-3 inline-block font-medium text-brand hover:underline">
            Choose a template to start
          </Link>
          <span className="mx-2 text-slate-400">or</span>
          <Link href="/upload" className="inline-block font-medium text-brand hover:underline">
            upload a CV you already have
          </Link>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {items &&
          groupVersions(items).map(({ original, versions }) => (
            <li key={original.id}>
              {row(original, false)}
              {versions.length > 0 && (
                <ul aria-label={`Tailored versions of ${original.title || "Untitled resume"}`} className="ml-6 mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                  {versions.map((v) => (
                    <li key={v.id}>{row(v, true)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
      </ul>
    </main>
  );
}

export function Dashboard() {
  return (
    <RequireAuth>
      <List />
    </RequireAuth>
  );
}
