"use client";

import { useMemo, useState } from "react";

import { useHydrated } from "@/lib/useHydrated";
import { clearImportReview, OPEN_AI_CHAT_EVENT, readImportReview } from "@/lib/upload/review";

/** Shown once after a CV was imported: what to check, and a way to fill the gaps with the AI chat. */
export function ImportBanner({ resumeId }: { resumeId: string }) {
  // Session storage only exists in the browser, so it is read once the page has hydrated.
  const hydrated = useHydrated();
  const [dismissed, setDismissed] = useState(false);
  const review = useMemo(() => (hydrated ? readImportReview(resumeId) : null), [hydrated, resumeId]);

  if (!review || dismissed) return null;

  function dismiss() {
    clearImportReview(resumeId);
    setDismissed(true);
  }

  return (
    <section role="region" aria-label="About your imported CV" className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {review.demo ? "Sample CV (demo mode): your file was not read." : "We made this from your file. Please read it through before you use it."}
          </p>
          {review.notes.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {review.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event(OPEN_AI_CHAT_EVENT));
              dismiss();
            }}
            className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700"
          >
            Fill the gaps with AI chat
          </button>
          <button type="button" onClick={dismiss} className="rounded-md border border-amber-300 px-3 py-1 hover:bg-amber-100">
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}
