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
import { FieldSheet } from "./FieldSheet";
import { PreviewPanel } from "./PreviewPanel";
import { VisualTopBar } from "./VisualTopBar";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { downloadPdf } from "@/lib/exportPdf";
import { fieldKeyOf, orderForForm } from "@/lib/resume/fieldAccess";
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

  // Phones, small windows and touch screens: text is not edited in place. Tapping it opens a sheet at the
  // bottom with a real-sized input, and the page above is a zoomable overview.
  const compact = useMediaQuery("(max-width: 767px), (hover: none)");
  const touchEditing = visualMode && compact;
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [zoom, setZoom] = useState<"fit" | 0.75 | 1>("fit");
  const openField = useCallback(
    (key: string) => setSheetKey(fieldKeyOf(key)),
    [],
  );
  const closeSheet = useCallback(() => setSheetKey(null), []);
  const onSheetHeight = useCallback((px: number) => setSheetHeight(px), []);
  // Leaving touch editing (a bigger window, or another version) closes the sheet for good.
  if (!touchEditing && sheetKey !== null) setSheetKey(null);

  /** Moves the sheet to the field before or after the current one, in the order they appear on the page. */
  const navigateField = useCallback(
    (direction: -1 | 1) => {
      const root = previewRef.current;
      if (!root || !sheetKey) return;
      const seen: string[] = [];
      root.querySelectorAll<HTMLElement>("[data-focus-key]").forEach((el) => {
        const k = fieldKeyOf(el.dataset.focusKey ?? "");
        if (k && !seen.includes(k)) seen.push(k);
      });
      const keys = orderForForm(seen, doc);
      const at = keys.indexOf(sheetKey);
      const next = keys[at + direction];
      if (next) setSheetKey(next);
    },
    [sheetKey, doc],
  );

  // Keep the field being edited visible above the sheet.
  useEffect(() => {
    if (!sheetKey || !touchEditing) return;
    const root = previewRef.current;
    if (!root) return;
    const id = window.requestAnimationFrame(() => {
      const wanted = [
        ...root.querySelectorAll<HTMLElement>("[data-focus-key]"),
      ].find((el) => fieldKeyOf(el.dataset.focusKey ?? "") === sheetKey);
      if (!wanted) return;
      const box = wanted.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      const top = rootBox.top + 12;
      const bottom = window.innerHeight - sheetHeight - 12;
      if (box.top < top || box.bottom > bottom) {
        root.scrollBy({
          top: box.top - (top + Math.max(0, bottom - top) / 3),
          behavior: "smooth",
        });
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [sheetKey, sheetHeight, touchEditing]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // PDF export: the server prints exactly what the template draws, from the CV as it is on screen now.
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  async function exportPdf() {
    setExportError(null);
    if (isBlank(doc.data)) {
      setExportError(
        "Your CV is empty. Add some content before downloading it.",
      );
      return;
    }
    setExporting(true);
    try {
      await downloadPdf(doc);
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : "Could not make the PDF.",
      );
    } finally {
      setExporting(false);
    }
  }
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
      <header
        className={`flex flex-wrap items-center border-b border-slate-200 bg-white px-3 ${compact ? "gap-x-2 gap-y-0.5 py-1" : "gap-x-3 gap-y-1 py-2"}`}
      >
        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:underline"
        >
          {compact ? <span aria-label="My resumes">←</span> : "← My resumes"}
        </Link>
        <input
          aria-label="Resume name"
          className={`${inputClass} min-w-0 font-medium ${compact ? "!w-auto flex-1" : "!w-56"}`}
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
              {!compact && <span>Version</span>}
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
          <button
            type="button"
            onClick={exportPdf}
            aria-label={exporting ? "Preparing PDF" : "Download PDF"}
            disabled={exporting}
            className="ml-2 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {exporting ? "Preparing PDF…" : compact ? "PDF" : "Download PDF"}
          </button>
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
          compact={compact}
          zoom={zoom}
          onZoom={setZoom}
        />
      )}
      {exportError && (
        <p
          role="alert"
          className="flex items-center justify-between bg-red-50 px-3 py-1.5 text-sm text-red-700"
        >
          <span>{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="ml-3 underline"
          >
            Dismiss
          </button>
        </p>
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
          style={sheetKey ? { paddingBottom: sheetHeight + 16 } : undefined}
          className={`${view === "preview" || visualMode ? "block" : "hidden"} min-w-0 flex-1 select-none overflow-y-auto p-4 lg:block ${
            touchEditing
              ? `rb-compact ${zoom === "fit" ? "" : "overflow-x-auto"} !px-2 !pt-2`
              : ""
          }`}
        >
          <div
            className={
              zoom !== "fit" && touchEditing ? "" : "mx-auto max-w-[820px]"
            }
          >
            <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
              <span>
                {touchEditing
                  ? "Tap any text to edit it. Grey text is not in your PDF."
                  : visualMode
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
              touch={touchEditing}
              selectedKey={sheetKey}
              onOpenField={openField}
              tools={!touchEditing}
              zoom={touchEditing && zoom !== "fit" ? zoom : null}
            />
          </div>
        </main>
        {visualMode && previewOpen && wide && (
          <PreviewPanel
            doc={doc}
            overlay={false}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>
      {visualMode && previewOpen && !wide && (
        <PreviewPanel doc={doc} overlay onClose={() => setPreviewOpen(false)} />
      )}
      {touchEditing && sheetKey && (
        <FieldSheet
          doc={doc}
          edit={edit}
          fieldKey={sheetKey}
          onClose={closeSheet}
          onNavigate={navigateField}
          onHeight={onSheetHeight}
          pickPhoto={pickPhoto}
        />
      )}
      {version === "c" && !compact && barOpen && activeTarget && (
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
