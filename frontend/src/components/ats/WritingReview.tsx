"use client";

import { useState } from "react";

import { ProBadge } from "@/components/app/ProBadge";
import { aiApi, ApiError } from "@/lib/api";
import type { Snapshot } from "@/lib/ai/snapshot";
import type { ReviewResponse } from "@/lib/ats/types";

/** The AI part of the ATS checker: feedback on the wording, with a suggested rewrite for each point. */
export function WritingReview({ snapshot }: { snapshot: Snapshot }) {
  const [state, setState] = useState<{ busy: boolean; error: string | null; data: ReviewResponse | null }>({
    busy: false,
    error: null,
    data: null,
  });
  const [copied, setCopied] = useState<number | null>(null);

  async function run() {
    setState({ busy: true, error: null, data: null });
    try {
      setState({ busy: false, error: null, data: await aiApi.writingReview(snapshot) });
    } catch (e) {
      setState({ busy: false, error: e instanceof ApiError ? e.message : "Something went wrong. Please try again.", data: null });
    }
  }

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      window.setTimeout(() => setCopied((c) => (c === index ? null : c)), 1500);
    } catch {
      /* clipboard blocked: the text is on screen to select */
    }
  }

  const { busy, error, data } = state;
  return (
    <section aria-label="Review my writing" className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Review my writing <ProBadge />
          </h2>
          <p className="text-sm text-slate-600">
            AI reads your summary and bullet points and suggests clearer wording. It only uses facts already in your CV.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Reviewing…" : data ? "Review again" : "Review my writing"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-4">
          {data.summary && <p className="text-slate-800">{data.summary}</p>}
          {data.items.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No wording changes to suggest.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.items.map((item, i) => (
                <li key={`${item.entry}-${item.field}-${i}`} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="text-slate-500">Now</p>
                  <p className="text-slate-800">{item.original}</p>
                  <p className="mt-2 text-amber-800">{item.issue}</p>
                  <p className="mt-2 text-slate-500">Suggestion</p>
                  <p className="font-medium text-slate-900">{item.suggestion}</p>
                  <button
                    type="button"
                    onClick={() => copy(item.suggestion, i)}
                    className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    {copied === i ? "Copied" : "Copy suggestion"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {data.demo && "Demo mode: this is sample feedback. "}AI can make mistakes: check each suggestion is true before you use it. Your CV text is
            sent to our AI provider (Anthropic) to write this.
          </p>
        </div>
      )}
    </section>
  );
}
