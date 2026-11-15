"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import type { VisualApi } from "@/components/resume/Editable";
import { editKey } from "@/components/resume/Editable";
import { EDITOR_VERSIONS, FEATURES, type EditorVersion } from "@/lib/config";
import { isBlank } from "@/lib/resume/defaults";
import { sampleDoc } from "@/lib/resume/doc";
import { historyReducer, initHistory } from "@/lib/resume/history";
import {
  applyEdit,
  setPhoto,
  setTitle,
  type Mutation,
} from "@/lib/resume/mutations";
import { PhotoError, processPhoto } from "@/lib/resume/photo";
import { targetForRef } from "@/lib/resume/styleTargets";
import type { EditRef, ResumeDoc } from "@/lib/resume/types";

import { BasicsEditor } from "./BasicsEditor";
import { DesignPanel } from "./DesignPanel";
import type { Edit } from "./FieldEditors";
import { RedoIcon, UndoIcon } from "./Icons";
import { SectionsEditor } from "./SectionsEditor";
import { FloatingStyleBar } from "./FloatingStyleBar";
import { StyleUiContext } from "./StyleUi";
import { ThemeCustomiser } from "./ThemeCustomiser";
import { ThemePicker } from "./ThemePicker";
import { PreviewPanel } from "./PreviewPanel";
import { VisualTopBar } from "./VisualTopBar";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { IconButton, inputClass } from "./ui";
import { useAutosave, type SaveStatus } from "./useAutosave";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "All changes saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Could not save. Retrying…",
};

const VERSION_KEY = "rb.editorVersion";
const isVersion = (v: unknown): v is EditorVersion =>
  EDITOR_VERSIONS.some((x) => x.id === v);

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

  // Version C: the style bar floats next to the text last clicked in the preview.
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [barOpen, setBarOpen] = useState(false);
  const closeBar = useCallback(() => setBarOpen(false), []);
  const previewRef = useRef<HTMLElement>(null);
  const onFocusKey = useCallback((key: string | null) => {
    if (key) {
      setLastKey(key);
      setBarOpen(true);
    }
  }, []);
  const activeTarget = useMemo(() => {
    if (!lastKey) return null;
    try {
      return targetForRef(
        doc,
        JSON.parse(lastKey.replace(/#\d+$/, "")) as EditRef,
      );
    } catch {
      return null;
    }
  }, [lastKey, doc]);

  const styleUi = useMemo(
    () => ({ enabled: version === "b", styles: doc.design.styles }),
    [version, doc.design.styles],
  );

  const edit = useCallback<Edit>((mutation: Mutation, coalesceKey?: string) => {
    dispatch({ type: "mutate", mutation, coalesceKey, at: Date.now() });
  }, []);
  const onPreviewEdit = useCallback(
    (ref: EditRef, text: string) => edit(applyEdit(ref, text), editKey(ref)),
    [edit],
  );

  // Version C is page-first: no form, everything is done on the page.
  const visualMode = version === "c";
  const [ghost, setGhost] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Side by side only when each page has room; otherwise the preview covers the editor.
  const wide = useMediaQuery("(min-width: 1500px)");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const pickPhoto = useCallback(() => photoInput.current?.click(), []);
  const visual = useMemo<VisualApi>(
    () => ({ edit, pickPhoto }),
    [edit, pickPhoto],
  );
  async function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    try {
      edit(setPhoto(await processPhoto(file)));
    } catch (e) {
      setPhotoError(
        e instanceof PhotoError ? e.message : "Could not use that image.",
      );
    }
    if (photoInput.current) photoInput.current.value = "";
  }

  // Ctrl/Cmd+Z and Shift+Z (or Ctrl+Y) undo and redo everywhere, including inside the preview.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) dispatch({ type: "undo" });
      else if ((k === "z" && e.shiftKey) || k === "y")
        dispatch({ type: "redo" });
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // An empty resume previews sample content so the template is visible; it is never saved.
  const blank = isBlank(doc.data);
  const shown = useMemo<ResumeDoc>(
    () =>
      blank && !visualMode
        ? { ...sampleDoc(doc.templateId), design: doc.design }
        : doc,
    [blank, doc, visualMode],
  );

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-3 py-2">
        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:underline"
        >
          ← My resumes
        </Link>
        <input
          aria-label="Resume name"
          className={`${inputClass} !w-56 min-w-0 font-medium`}
          value={doc.title}
          maxLength={200}
          onChange={(e) => edit(setTitle(e.target.value), "title")}
        />
        <span
          role="status"
          className={`text-xs ${status === "error" ? "text-red-700" : "text-slate-500"}`}
        >
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
          <IconButton
            label="Undo (Ctrl+Z)"
            disabled={history.past.length === 0}
            onClick={() => dispatch({ type: "undo" })}
          >
            <UndoIcon />
          </IconButton>
          <IconButton
            label="Redo (Ctrl+Shift+Z)"
            disabled={history.future.length === 0}
            onClick={() => dispatch({ type: "redo" })}
          >
            <RedoIcon />
          </IconButton>
        </div>
        <div
          className={`${visualMode ? "hidden" : "flex"} w-full gap-1 lg:hidden`}
          role="tablist"
          aria-label="Editor view"
        >
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

      {visualMode && (
        <VisualTopBar
          templateId={doc.templateId}
          design={doc.design}
          edit={edit}
          ghost={ghost}
          onGhost={setGhost}
          preview={previewOpen}
          onPreview={setPreviewOpen}
        />
      )}
      {photoError && (
        <p role="alert" className="bg-red-50 px-3 py-1.5 text-sm text-red-700">
          {photoError}
        </p>
      )}
      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPhotoChosen(e.target.files?.[0])}
      />

      <div className="flex min-h-0 flex-1">
        {!visualMode && (
          <aside
            className={`${view === "edit" ? "flex" : "hidden"} min-h-0 w-full flex-col border-r border-slate-200 bg-slate-50 lg:flex lg:w-[440px] lg:shrink-0`}
          >
            <div
              className="flex gap-1 border-b border-slate-200 bg-white px-3 pt-2"
              role="tablist"
              aria-label="Editor panels"
            >
              {(
                [
                  ["content", "Content"],
                  ["design", version === "a" ? "Template & style" : "Template"],
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
                      <ThemePicker
                        templateId={doc.templateId}
                        design={doc.design}
                        edit={edit}
                      />
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          aria-expanded={customising}
                          onClick={() => setCustomising(!customising)}
                          className="text-sm font-medium text-brand hover:underline"
                        >
                          {customising
                            ? "Hide custom theme options"
                            : "Customise theme: colours, font, spacing"}
                        </button>
                        {customising && (
                          <div className="mt-4">
                            <ThemeCustomiser design={doc.design} edit={edit} />
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                  <BasicsEditor basics={doc.data.basics} edit={edit} />
                  <SectionsEditor sections={doc.data.sections} edit={edit} />
                </StyleUiContext.Provider>
              ) : (
                <DesignPanel
                  templateId={doc.templateId}
                  design={doc.design}
                  edit={edit}
                  showParts={version === "a"}
                  showCustomise={version === "a"}
                  showTheme={version === "a"}
                />
              )}
            </div>
          </aside>
        )}

        <main
          ref={previewRef}
          className={`${view === "preview" || visualMode ? "block" : "hidden"} min-w-0 flex-1 select-none overflow-y-auto p-4 lg:block`}
        >
          <div className="mx-auto max-w-[820px]">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
              <span>
                {visualMode
                  ? ghost
                    ? "Click any text to edit or style it. Hover a block for its tools. Grey text is a placeholder and is not in your PDF."
                    : "Click any text to edit or style it. Hover a block for its tools."
                  : blank
                    ? "Sample content. Start typing and yours replaces it."
                    : "Click any text on the page to edit it."}
              </span>
              <span>
                {pages} {pages === 1 ? "page" : "pages"}
              </span>
            </div>
            <ResumeCanvas
              doc={shown}
              mode="preview"
              editable={visualMode || !blank}
              onEdit={onPreviewEdit}
              onPageCount={setPages}
              onFocusKey={onFocusKey}
              visual={visualMode ? visual : null}
              ghost={visualMode && ghost}
            />
          </div>
        </main>
        {visualMode && previewOpen && wide && <PreviewPanel doc={doc} overlay={false} onClose={() => setPreviewOpen(false)} />}
      </div>
      {visualMode && previewOpen && !wide && <PreviewPanel doc={doc} overlay onClose={() => setPreviewOpen(false)} />}
      {version === "c" && barOpen && activeTarget && (
        <FloatingStyleBar
          target={activeTarget}
          style={doc.design.styles[activeTarget]}
          edit={edit}
          anchorKey={lastKey}
          container={previewRef}
          onClose={closeBar}
        />
      )}
    </div>
  );
}
