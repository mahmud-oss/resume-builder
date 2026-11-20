"use client";

import { useState } from "react";

import { aiApi, ApiError } from "@/lib/api";
import type { Snapshot } from "@/lib/ai/snapshot";
import type { Language } from "@/lib/match/types";
import { describeEntry, kindOf } from "@/lib/tailor/apply";
import { REGENERATE_HINTS, type ChangeItem } from "@/lib/tailor/types";

/** One proposed change: the wording before and after, and the user's decision about it (PRD TR-03, TR-04). */
export function ChangeCard({
  item,
  snapshot,
  jd,
  language,
  onChange,
}: {
  item: ChangeItem;
  snapshot: Snapshot;
  jd: string;
  language: Language;
  onChange: (next: ChangeItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const where = describeEntry(snapshot, item.entry);
  const set = (patch: Partial<ChangeItem>) => onChange({ ...item, ...patch });

  async function regenerate(hint: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await aiApi.tailorRegenerate({ cv: snapshot, jobDescription: jd, entry: item.entry, field: item.field, previous: item.text, hint, language });
      // New wording starts undecided again: the user has not seen it yet.
      onChange({ ...item, text: r.after, reason: r.reason || item.reason, edited: false, status: "pending" });
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const ring =
    item.status === "accepted" ? "ring-2 ring-green-400" : item.status === "rejected" ? "opacity-60 ring-1 ring-slate-200" : "ring-1 ring-slate-200";
  const asLines = (t: string) => t.split("\n").filter(Boolean);

  return (
    <li className={`rounded-lg bg-white p-4 ${ring}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {kindOf(item.field)} · {where.section}
          </p>
          <p className="font-medium text-slate-900">{where.label}</p>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            item.status === "accepted" ? "bg-green-100 text-green-800" : item.status === "rejected" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {item.status === "pending" ? "Not decided" : item.status === "accepted" ? "Accepted" : "Rejected"}
        </span>
      </div>
      {item.reason && <p className="mt-1 text-sm text-slate-600">{item.reason}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Now</p>
          <div className="mt-1 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
            {asLines(item.before).map((l, i) => (
              <p key={i} className={asLines(item.before).length > 1 ? "before:mr-1 before:content-['•']" : ""}>
                {l}
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{item.edited ? "Your wording" : "Suggested"}</p>
          {editing ? (
            <textarea
              aria-label="Your wording"
              value={item.text}
              rows={Math.max(3, asLines(item.text).length + 1)}
              onChange={(e) => set({ text: e.target.value, edited: true })}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
            />
          ) : (
            <div className="mt-1 rounded-md bg-green-50 p-2 text-sm text-slate-900">
              {asLines(item.text).map((l, i) => (
                <p key={i} className={asLines(item.text).length > 1 ? "before:mr-1 before:content-['•']" : ""}>
                  {l}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={item.status === "accepted"}
          disabled={busy || item.text.trim() === ""}
          onClick={() => set({ status: item.status === "accepted" ? "pending" : "accepted" })}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {item.status === "accepted" ? "Accepted ✓" : "Accept"}
        </button>
        <button
          type="button"
          aria-pressed={item.status === "rejected"}
          disabled={busy}
          onClick={() => set({ status: item.status === "rejected" ? "pending" : "rejected" })}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          {item.status === "rejected" ? "Rejected ✓" : "Reject"}
        </button>
        <button type="button" disabled={busy} onClick={() => setEditing((e) => !e)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          {editing ? "Done editing" : "Edit"}
        </button>
        {busy && <span className="text-sm text-slate-500">Rewriting…</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Rewrite it:</span>
        {REGENERATE_HINTS.map((h) => (
          <button key={h} type="button" disabled={busy} onClick={() => void regenerate(h)} className="rounded-full border border-slate-300 px-2.5 py-0.5 hover:bg-slate-50 disabled:opacity-60">
            {h}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => void regenerate("")} className="rounded-full border border-slate-300 px-2.5 py-0.5 hover:bg-slate-50 disabled:opacity-60">
          Try again
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}
