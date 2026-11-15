"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { editKey } from "@/components/resume/Editable";
import { EDITOR_VERSIONS, FEATURES, type EditorVersion } from "@/lib/config";
import { isBlank } from "@/lib/resume/defaults";
import { sampleDoc } from "@/lib/resume/doc";
import { historyReducer, initHistory } from "@/lib/resume/history";
import { applyEdit, setTitle, type Mutation } from "@/lib/resume/mutations";
import { targetForRef } from "@/lib/resume/styleTargets";
import type { EditRef, ResumeDoc } from "@/lib/resume/types";

import { BasicsEditor } from "./BasicsEditor";
import { DesignPanel } from "./DesignPanel";
import type { Edit } from "./FieldEditors";
import { RedoIcon, UndoIcon } from "./Icons";
import { SectionsEditor } from "./SectionsEditor";
import { StyleControls } from "./StyleControls";
import { StyleUiContext } from "./StyleUi";
import { ThemeCustomiser } from "./ThemeCustomiser";
import { ThemePicker } from "./ThemePicker";
import { IconButton, inputClass } from "./ui";
import { useAutosave, type SaveStatus } from "./useAutosave";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "All changes saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Could not save. Retrying…",
};

const VERSION_KEY = "rb.editorVersion";
const isVersion = (v: unknown): v is EditorVersion => EDITOR_VERSIONS.some((x) => x.id === v);

/** The version in the address (?v=b) wins, then the one chosen last time in this browser. */
function readVersion(): EditorVersion {
  try {
    const q = new URLSearchParams(window.location.search).get("v");
    if (isVersion(q)) return q;
    const saved = localStorage.getItem(VERSION_KEY);
    if (isVersion(saved)) return saved;
  } catch {
    /* storage blocked: fall back to A */
  }
  return "a";
}

export function Editor({ id, initial }: { id: string; initial: ResumeDoc }) {
  const [history, dispatch] = useReducer(historyReducer, initial, initHistory);
  const doc = history.present;
  const { status } = useAutosave(id, history);

  const [tab, setTab] = useState<"content" | "design">("content");
  const [view, setView] = useState<"edit" | "preview">("edit"); // small screens show one panel at a time
  const [pages, setPages] = useState(1);
  const [customising, setCustomising] = useState(false);

  const [version, setVersion] = useState<EditorVersion>(readVersion);
  const chooseVersion = (v: EditorVersion) => {
    setVersion(v);
    try {
      localStorage.setItem(VERSION_KEY, v);
    } catch {
      /* not saved; fine */
    }
  };

  // Version C: remember the last text clicked in the preview so its style bar stays usable.
  const [lastKey, setLastKey] = useState<string | null>(null);
  const onFocusKey = useCallback((key: string | null) => {
    if (key) setLastKey(key);
  }, []);
  const activeTarget = useMemo(() => {
    if (!lastKey) return null;
    try {
      return targetForRef(doc, JSON.parse(lastKey.replace(/#\d+$/, "")) as EditRef);
    } catch {
      return null;
    }
  }, [lastKey, doc]);

  const styleUi = useMemo(() => ({ enabled: version === "b", styles: doc.design.styles }), [version, doc.design.styles]);

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
          {FEATURES.versionSwitch && (
            <div
              role="group"
              aria-label="Editor version (for testing)"
              className="mr-2 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900"
            >
              <span>Version</span>
              {EDITOR_VERSIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  title={v.hint}
                  aria-pressed={version === v.id}
                  onClick={() => chooseVersion(v.id)}
                  className={`h-6 w-6 rounded font-semibold ${version === v.id ? "bg-amber-500 text-white" : "hover:bg-amber-100"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
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
                ["design", version === "a" ? "Template & style" : version === "b" ? "Template" : "Template & colours"],
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
              <StyleUiContext.Provider value={styleUi}>
                {version !== "a" && (
                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h2 className="mb-3 font-semibold">Theme</h2>
                    <ThemePicker templateId={doc.templateId} design={doc.design} edit={edit} />
                    {version === "b" && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          aria-expanded={customising}
                          onClick={() => setCustomising(!customising)}
                          className="text-sm font-medium text-brand hover:underline"
                        >
                          {customising ? "Hide custom theme options" : "Customise theme: colours, font, spacing"}
                        </button>
                        {customising && (
                          <div className="mt-4">
                            <ThemeCustomiser design={doc.design} edit={edit} />
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}
                <BasicsEditor basics={doc.data.basics} edit={edit} />
                <SectionsEditor sections={doc.data.sections} edit={edit} />
              </StyleUiContext.Provider>
            ) : (
              <DesignPanel templateId={doc.templateId} design={doc.design} edit={edit} showParts={version === "a"} showCustomise={version !== "b"} showTheme={version !== "b"} />
            )}
          </div>
        </aside>

        <main className={`${view === "preview" ? "block" : "hidden"} min-w-0 flex-1 overflow-y-auto p-4 lg:block`}>
          {version === "c" && (
            <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-4 border-b border-slate-200 bg-slate-100/95 p-3 backdrop-blur">
              {activeTarget ? (
                <StyleControls target={activeTarget} style={doc.design.styles[activeTarget]} edit={edit} />
              ) : (
                <p className="text-sm text-slate-600">
                  {blank
                    ? "Type something first, then click any text on the page to style it here."
                    : "Click any text on the page, then style it here."}
                </p>
              )}
            </div>
          )}
          <div className="mx-auto max-w-[820px]">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
              <span>{blank ? "Sample content. Start typing and yours replaces it." : "Click any text on the page to edit it."}</span>
              <span>
                {pages} {pages === 1 ? "page" : "pages"}
              </span>
            </div>
            <ResumeCanvas doc={shown} mode="preview" editable={!blank} onEdit={onPreviewEdit} onPageCount={setPages} onFocusKey={onFocusKey} />
          </div>
        </main>
      </div>
    </div>
  );
}
