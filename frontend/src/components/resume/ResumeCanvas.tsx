"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { fontFamily } from "@/lib/resume/design";
import { pageCount, paginate } from "@/lib/resume/paginate";
import { getTemplate, type TemplateConfig } from "@/lib/resume/templates";
import type { EditRef, ResumeDoc } from "@/lib/resume/types";

import { buildColumns, onAccent, type Block } from "./buildColumns";
import { EditContext, type EditApi, type FocusRequest, type VisualApi } from "./Editable";

/** A4 at 96 dpi. */
export const PAGE_W = 794;
export const PAGE_H = 1123;

const PAGE_GAP = 24;
const SIDEBAR_W = 250;
const SIDEBAR_PAD = 26;
const SIDEBAR_MAIN_PAD = 36;
const SIDEBAR_VERT = 44;

type Geometry = {
  mainWidth: number;
  sideWidth: number;
  availMain: (page: number) => number;
  availSide: (page: number) => number;
};

function geometry(t: TemplateConfig): Geometry {
  if (t.layout === "sidebar") {
    const avail = () => PAGE_H - 2 * SIDEBAR_VERT;
    return {
      mainWidth: PAGE_W - SIDEBAR_W - 2 * SIDEBAR_MAIN_PAD,
      sideWidth: SIDEBAR_W - 2 * SIDEBAR_PAD,
      availMain: avail,
      availSide: avail,
    };
  }
  const topFirst = t.margin.top;
  const topRest = t.margin.top || 40;
  const bottom = t.margin.top || 40;
  return {
    mainWidth: PAGE_W - 2 * t.margin.side,
    sideWidth: 0,
    availMain: (page) => PAGE_H - (page === 0 ? topFirst : topRest) - bottom,
    availSide: () => 0,
  };
}

type Heights = { main: number[]; side: number[] };

function sameHeights(a: Heights, b: Heights): boolean {
  const eq = (x: number[], y: number[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  return eq(a.main, b.main) && eq(a.side, b.side);
}

export type CanvasMode =
  /** Fits the width of its container, shows every page, and can be edited. */
  | "preview"
  /** First page only, scaled to fit its container. For galleries. */
  | "thumb"
  /** Full size, pages stacked with page breaks. Used to make the PDF. */
  | "print";

type Props = {
  doc: ResumeDoc;
  mode?: CanvasMode;
  /** Allow editing text directly in the preview. */
  editable?: boolean;
  onEdit?: (ref: EditRef, text: string) => void;
  /** Called with the number of pages whenever it changes. */
  onPageCount?: (count: number) => void;
  /** Called with the key of the text being edited (or null when focus leaves it). */
  onFocusKey?: (key: string | null) => void;
  /** Page-first editor: tools on the page itself. */
  visual?: VisualApi | null;
  /** Show greyed placeholders for empty things (edit view only; never exported). */
  ghost?: boolean;
};

export function ResumeCanvas({ doc, mode = "preview", editable = false, onEdit, onPageCount, onFocusKey, visual = null, ghost = false }: Props) {
  const template = getTemplate(doc.templateId);
  const geo = useMemo(() => geometry(template), [template]);
  const canEdit = editable && !!onEdit && mode === "preview";

  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const showGhost = ghost && mode === "preview";
  const columns = useMemo(
    () => buildColumns(doc, template, canEdit ? focusedKey : null, showGhost),
    [doc, template, canEdit, focusedKey, showGhost],
  );

  // --- measuring -------------------------------------------------------------------------
  const mainRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Heights>({ main: [], side: [] });
  const [fontsReady, setFontsReady] = useState(false);
  const [measured, setMeasured] = useState(false);

  const measure = useCallback(() => {
    const read = (el: HTMLDivElement | null) =>
      el ? Array.from(el.children).map((c) => (c as HTMLElement).offsetHeight) : [];
    const next = { main: read(mainRef.current), side: read(sideRef.current) };
    setHeights((prev) => (sameHeights(prev, next) ? prev : next));
    setMeasured(true);
  }, []);

  // After every render, so edits that change a block's height are picked up before paint.
  useLayoutEffect(() => {
    measure();
  });

  // Fonts change text height when they finish loading.
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      measure();
      setFontsReady(true);
    });
    return () => {
      alive = false;
    };
  }, [doc.design.font, measure]);

  useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (mainRef.current) ro.observe(mainRef.current);
    if (sideRef.current) ro.observe(sideRef.current);
    return () => ro.disconnect();
  }, [measure, template.layout]);

  // --- pagination ------------------------------------------------------------------------
  const mainPages = paginate(
    columns.main.map((b, i) => ({ height: heights.main[i] ?? 0, breakBefore: b.breakBefore })),
    geo.availMain,
  );
  const sidePages = paginate(
    columns.side.map((b, i) => ({ height: heights.side[i] ?? 0 })),
    geo.availSide,
  );
  const totalPages = mode === "thumb" ? 1 : pageCount(mainPages, sidePages);

  useEffect(() => {
    onPageCount?.(totalPages);
  }, [totalPages, onPageCount]);

  // --- scaling ---------------------------------------------------------------------------
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(mode === "print" ? 1 : 0.6);

  useLayoutEffect(() => {
    if (mode === "print") return;
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(el.clientWidth / PAGE_W, mode === "thumb" ? 10 : 1.4));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  // --- drawing ---------------------------------------------------------------------------
  const rootStyle: CSSProperties = {
    fontFamily: fontFamily(doc.design.font),
    fontSize: `${(doc.design.fontSize * 96) / 72}px`,
    lineHeight: 1.4,
    color: doc.design.textColor,
  };

  const setFocus = useCallback(
    (key: string | null) => {
      setFocusedKey(key);
      onFocusKey?.(key);
    },
    [onFocusKey],
  );
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const requestFocus = useCallback(
    (request: FocusRequest) => {
      setFocus(request.key); // so an empty new line is drawn
      setFocusRequest(request);
    },
    [setFocus],
  );
  const clearFocusRequest = useCallback(() => setFocusRequest(null), []);
  const editApi = useMemo<EditApi | null>(
    () =>
      canEdit
        ? { onEdit: onEdit!, focusedKey, setFocusedKey: setFocus, focusRequest, requestFocus, clearFocusRequest, visual }
        : null,
    [canEdit, onEdit, focusedKey, setFocus, focusRequest, requestFocus, clearFocusRequest, visual],
  );

  const wrap = (b: Block) => (
    <div key={b.key} style={{ display: "flow-root" }}>
      {b.node}
    </div>
  );

  const onPage = (blocks: Block[], pages: number[], page: number) =>
    blocks.filter((_, i) => pages[i] === page).map(wrap);

  const preview = mode === "preview";
  const gap = mode === "print" ? 0 : PAGE_GAP;

  function renderPage(page: number) {
    const last = page === totalPages - 1;
    const pageStyle: CSSProperties = {
      ...rootStyle,
      width: PAGE_W,
      height: PAGE_H,
      background: "#ffffff",
      position: "relative",
      overflow: "hidden",
      boxSizing: "border-box",
      marginBottom: last ? 0 : gap,
      boxShadow: preview || mode === "thumb" ? "0 1px 3px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08)" : undefined,
      breakAfter: mode === "print" && !last ? "page" : "auto",
      printColorAdjust: "exact",
      WebkitPrintColorAdjust: "exact",
    };

    if (template.layout === "sidebar") {
      return (
        <div key={page} className="rb-page" style={{ ...pageStyle, display: "flex" }}>
          <aside
            style={{
              width: SIDEBAR_W,
              flexShrink: 0,
              boxSizing: "border-box",
              background: doc.design.accent,
              color: onAccent(doc.design.accent),
              padding: `${SIDEBAR_VERT}px ${SIDEBAR_PAD}px`,
            }}
          >
            {onPage(columns.side, sidePages, page)}
          </aside>
          <div style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: `${SIDEBAR_VERT}px ${SIDEBAR_MAIN_PAD}px` }}>
            {onPage(columns.main, mainPages, page)}
          </div>
        </div>
      );
    }

    const top = page === 0 ? template.margin.top : template.margin.top || 40;
    const bottom = template.margin.top || 40;
    return (
      <div
        key={page}
        className="rb-page"
        style={{ ...pageStyle, padding: `${top}px ${template.margin.side}px ${bottom}px` }}
      >
        {onPage(columns.main, mainPages, page)}
      </div>
    );
  }

  const stackHeight = totalPages * PAGE_H + (totalPages - 1) * gap;
  const ready = fontsReady && measured;

  return (
    <div
      ref={wrapRef}
      data-ready={mode === "print" ? String(ready) : undefined}
      data-pages={totalPages}
      style={{
        width: mode === "print" ? PAGE_W : "100%",
        height: mode === "print" ? undefined : stackHeight * scale,
        overflow: mode === "print" ? undefined : "hidden",
      }}
    >
      <div style={{ width: PAGE_W, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: "top left" }}>
        <EditContext.Provider value={editApi}>
          {Array.from({ length: totalPages }, (_, p) => renderPage(p))}
        </EditContext.Provider>
      </div>

      {/* Hidden copy used only to measure how tall each block is. Off-screen so it never affects scrolling. */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, visibility: "hidden", pointerEvents: "none" }}>
        <div ref={mainRef} style={{ ...rootStyle, width: geo.mainWidth }}>
          {columns.main.map(wrap)}
        </div>
        {template.layout === "sidebar" && (
          <div ref={sideRef} style={{ ...rootStyle, width: geo.sideWidth }}>
            {columns.side.map(wrap)}
          </div>
        )}
      </div>
    </div>
  );
}
