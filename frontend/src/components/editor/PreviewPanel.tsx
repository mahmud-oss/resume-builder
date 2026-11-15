"use client";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import type { ResumeDoc } from "@/lib/resume/types";

/** The CV exactly as it will be exported: no placeholders, no tools, not editable. */
export function PreviewPanel({
  doc,
  onClose,
  overlay,
}: {
  doc: ResumeDoc;
  onClose: () => void;
  /** Full-screen over the editor (narrow windows) instead of a panel beside it. */
  overlay: boolean;
}) {
  return (
    <section
      aria-label="Preview as exported"
      className={
        overlay
          ? "fixed inset-0 z-40 flex flex-col bg-slate-200"
          : "flex min-h-0 min-w-0 flex-1 flex-col border-l border-slate-300 bg-slate-200"
      }
    >
      <div className="flex items-center justify-between border-b border-slate-300 bg-white px-3 py-2 text-sm">
        <span className="font-medium">Preview, as it will be exported</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          Close preview
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-[820px]">
          <ResumeCanvas doc={doc} mode="preview" />
        </div>
      </div>
    </section>
  );
}
