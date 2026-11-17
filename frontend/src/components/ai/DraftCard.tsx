"use client";

import { useState } from "react";

import type { ChatDraft } from "@/lib/ai/types";

const QUICK_FEEDBACK = ["Shorter", "More formal", "Simpler"];

/**
 * Text the assistant wrote from what the user said. It is a draft until the user accepts it; they can
 * change it by hand (always free) or ask for it to be redone.
 */
export function DraftCard({
  draft,
  replacing,
  disabled,
  onAccept,
  onRegenerate,
}: {
  draft: ChatDraft;
  /** The text already in that field, which accepting would replace. */
  replacing: string;
  disabled: boolean;
  onAccept: (text?: string) => void;
  onRegenerate: (feedback: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "redo">("view");
  const [text, setText] = useState(draft.text);
  const [feedback, setFeedback] = useState("");

  const base = "rounded-lg border p-3 text-sm";

  if (draft.status === "accepted") {
    return (
      <div className={`${base} border-green-200 bg-green-50`}>
        <p className="whitespace-pre-wrap text-slate-800">{draft.text}</p>
        <p className="mt-1 text-xs font-medium text-green-800">
          ✓ Added to your CV
        </p>
      </div>
    );
  }
  if (draft.status === "replaced") {
    return (
      <div className={`${base} border-slate-200 bg-slate-50 text-slate-500`}>
        <p className="whitespace-pre-wrap line-through">{draft.text}</p>
        <p className="mt-1 text-xs">Replaced by a newer draft</p>
      </div>
    );
  }

  return (
    <div className={`${base} border-brand/40 bg-white`} aria-label="Draft">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">
        Draft · written by AI
      </p>

      {mode === "edit" ? (
        <textarea
          aria-label="Edit the draft"
          className="w-full rounded-md border border-slate-300 p-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          rows={Math.min(8, Math.max(3, text.split("\n").length + 1))}
          value={text}
          onChange={(e) => setText(e.target.value)}
          dir="auto"
        />
      ) : (
        <p className="whitespace-pre-wrap text-slate-900" dir="auto">
          {draft.text}
        </p>
      )}

      {draft.warnings.length > 0 && (
        <p
          role="note"
          className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900"
        >
          ⚠ {draft.warnings.join(" ")} Please check it before you accept.
        </p>
      )}
      {replacing.trim() !== "" && mode !== "edit" && (
        <p className="mt-2 text-xs text-slate-500">
          Accepting will replace the text you already have there.
        </p>
      )}

      {mode === "view" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAccept()}
            className="min-h-10 rounded-md bg-brand px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("edit")}
            className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("redo")}
            className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800 disabled:opacity-50"
          >
            Redo
          </button>
        </div>
      )}

      {mode === "edit" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled || text.trim() === ""}
            onClick={() => onAccept(text)}
            className="min-h-10 rounded-md bg-brand px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Use this text
          </button>
          <button
            type="button"
            onClick={() => {
              setText(draft.text);
              setMode("view");
            }}
            className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === "redo" && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FEEDBACK.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={feedback === f.toLowerCase()}
                onClick={() =>
                  setFeedback(
                    feedback === f.toLowerCase() ? "" : f.toLowerCase(),
                  )
                }
                className={`min-h-9 rounded-full border px-3 text-xs font-medium ${feedback === f.toLowerCase() ? "border-brand bg-brand/10 text-brand" : "border-slate-300 text-slate-700"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            aria-label="What should change?"
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="Or say what to change"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            dir="auto"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRegenerate(feedback)}
              className="min-h-10 rounded-md bg-brand px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Write it again
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
