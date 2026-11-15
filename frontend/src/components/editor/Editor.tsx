"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { editKey } from "@/components/resume/Editable";
import { isBlank } from "@/lib/resume/defaults";
import { sampleDoc } from "@/lib/resume/doc";
import { historyReducer, initHistory } from "@/lib/resume/history";
import { applyEdit, setTitle, type Mutation } from "@/lib/resume/mutations";
import type { EditRef, ResumeDoc } from "@/lib/resume/types";

import { BasicsEditor } from "./BasicsEditor";
import { DesignPanel } from "./DesignPanel";
import type { Edit } from "./FieldEditors";
import { RedoIcon, UndoIcon } from "./Icons";
import { SectionsEditor } from "./SectionsEditor";
import { IconButton, inputClass } from "./ui";
import { useAutosave, type SaveStatus } from "./useAutosave";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "All changes saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Could not save. Retrying…",
};

export function Editor({ id, initial }: { id: string; initial: ResumeDoc }) {
  const [history, dispatch] = useReducer(historyReducer, initial, initHistory);
  const doc = history.present;
  const { status } = useAutosave(id, history);

  const [tab, setTab] = useState<"content" | "design">("content");
  const [view, setView] = useState<"edit" | "preview">("edit"); // small screens show one panel at a time
  const [pages, setPages] = useState(1);

  const edit = useCallback<Edit>((mutation: Mutation, coalesceKey?: string) => {
    dispatch({ type: "mutate", mutation, coalesceKey, at: Date.now() });
  }, []);
  const onPreviewEdit = useCallback((ref: EditRef, text: string) => edit(applyEdit(ref, text), editKey(ref)), [edit]);

  // Ctrl/Cmd+Z and Shift+Z (or Ctrl+Y) undo and redo everywhere, including inside the preview.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) dispatch({ type: "undo" });
      else if ((k === "z" && e.shiftKey) || k === "y") dispatch({ type: "redo" });
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // An empty resume previews sample content so the template is visible; it is never saved.
  const blank = isBlank(doc.data);
  const shown = useMemo<ResumeDoc>(
    () => (blank ? { ...sampleDoc(doc.templateId), design: doc.design } : doc),
    [blank, doc],
  );

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-3 py-2">
        <Link href="/dashboard" className="text-sm text-slate-600 hover:underline">
          ← My resumes
        </Link>
        <input
          aria-label="Resume name"
          className={`${inputClass} !w-56 min-w-0 font-medium`}
          value={doc.title}
          maxLength={200}
          onChange={(e) => edit(setTitle(e.target.value), "title")}
        />
        <span role="status" className={`text-xs ${status === "error" ? "text-red-700" : "text-slate-500"}`}>
          {STATUS_TEXT[status]}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Undo (Ctrl+Z)" disabled={history.past.length === 0} onClick={() => dispatch({ type: "undo" })}>
            <UndoIcon />
          </IconButton>
          <IconButton label="Redo (Ctrl+Shift+Z)" disabled={history.future.length === 0} onClick={() => dispatch({ type: "redo" })}>
            <RedoIcon />
          </IconButton>
        </div>
        <div className="flex w-full gap-1 lg:hidden" role="tablist" aria-label="Editor view">
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium ${view === v ? "bg-brand text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {v === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`${view === "edit" ? "flex" : "hidden"} min-h-0 w-full flex-col border-r border-slate-200 bg-slate-50 lg:flex lg:w-[440px] lg:shrink-0`}>
          <div className="flex gap-1 border-b border-slate-200 bg-white px-3 pt-2" role="tablist" aria-label="Editor panels">
            {(
              [
                ["content", "Content"],
                ["design", "Template & style"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? "border-brand text-brand" : "border-transparent text-slate-600 hover:text-slate-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {tab === "content" ? (
              <>
                <BasicsEditor basics={doc.data.basics} edit={edit} />
                <SectionsEditor sections={doc.data.sections} edit={edit} />
              </>
            ) : (
              <DesignPanel templateId={doc.templateId} design={doc.design} edit={edit} />
            )}
          </div>
        </aside>

        <main className={`${view === "preview" ? "block" : "hidden"} min-w-0 flex-1 overflow-y-auto p-4 lg:block`}>
          <div className="mx-auto max-w-[820px]">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
              <span>{blank ? "Sample content. Start typing and yours replaces it." : "Click any text on the page to edit it."}</span>
              <span>
                {pages} {pages === 1 ? "page" : "pages"}
              </span>
            </div>
            <ResumeCanvas doc={shown} mode="preview" editable={!blank} onEdit={onPreviewEdit} onPageCount={setPages} />
          </div>
        </main>
      </div>
    </div>
  );
}
