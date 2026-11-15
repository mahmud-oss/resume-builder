"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { resumeApi, type ResumeSummary } from "@/lib/api";
import { getTemplate } from "@/lib/resume/templates";

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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My resumes</h1>
        <Link href="/templates" className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90">
          New resume
        </Link>
      </div>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {items === null && !error && <p className="mt-6 text-slate-500">Loading…</p>}
      {items?.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">You have no resumes yet.</p>
          <Link href="/templates" className="mt-3 inline-block font-medium text-brand hover:underline">
            Choose a template to start
          </Link>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {items?.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <Link href={`/editor/${r.id}`} className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.title || "Untitled resume"}</div>
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
