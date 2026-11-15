"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

import { FONTS, SCALES, STYLE_TARGETS } from "@/lib/resume/design";
import { resetTextStyle, setTextStyle } from "@/lib/resume/mutations";
import type { FontId, StyleTarget, TextStyle } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";
import { Palette } from "./Palette";
import { FLAGS, STYLE_COLORS } from "./StyleControls";

const GAP = 8;

/** True on narrow screens, where the bar docks to the bottom instead of floating next to the text. */
function useNarrow(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

const selectClass =
  "rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

type Props = {
  target: StyleTarget;
  style: TextStyle;
  edit: Edit;
  /** Key of the text it belongs to; the bar sits next to that text. */
  anchorKey: string | null;
  /** The scrolling preview panel. The bar hides when its text scrolls out of view. */
  container: RefObject<HTMLElement | null>;
  onClose: () => void;
};

/**
 * Style controls that float next to the text being edited (editor version C).
 * Buttons keep the text cursor where it was; the bar closes on Escape or a click elsewhere.
 */
export function FloatingStyleBar({ target, style, edit, anchorKey, container, onClose }: Props) {
  const info = STYLE_TARGETS.find((t) => t.id === target)!;
  const barRef = useRef<HTMLDivElement>(null);
  const lastRect = useRef<{ top: number; bottom: number; left: number } | null>(null);
  const narrow = useNarrow();
  const [colourOpen, setColourOpen] = useState(false);

  const place = () => {
    const bar = barRef.current;
    const panel = container.current?.getBoundingClientRect();
    if (!bar || !panel) return;
    if (narrow) {
      // Docked by CSS. Clear any position left over from floating, or the bar would stretch.
      bar.style.top = "";
      bar.style.left = "";
      bar.style.visibility = "visible";
      return;
    }
    const selector = anchorKey ? `[data-focus-key="${anchorKey.replace(/["\\]/g, "\\$&")}"]` : null;
    const el = selector ? container.current?.querySelector(selector) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      lastRect.current = { top: r.top, bottom: r.bottom, left: r.left };
    }
    const r = lastRect.current;
    if (!r) return;
    // If the text scrolled out of the panel, hide rather than float over something else.
    bar.style.visibility = r.bottom < panel.top || r.top > panel.bottom ? "hidden" : "visible";
    const w = bar.offsetWidth;
    const h = bar.offsetHeight;
    let top = r.top - h - GAP;
    if (top < panel.top + 4) top = r.bottom + GAP; // no room above: go below
    top = Math.max(4, Math.min(top, window.innerHeight - h - 4));
    const left = Math.min(Math.max(r.left, panel.left + 8), Math.max(panel.left + 8, panel.right - w - 8));
    bar.style.top = `${top}px`;
    bar.style.left = `${left}px`;
  };

  // Place before paint after every render (the text may have moved or changed size)...
  useLayoutEffect(place);

  // ...and again when the panel scrolls or the window resizes.
  useEffect(() => {
    const el = container.current;
    el?.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      el?.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  });

  // Close on Escape, or on a click that is neither on the bar nor on editable text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest("[data-style-bar], .rb-editable")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={barRef}
      data-style-bar
      role="toolbar"
      aria-label={`Style ${info.all}`}
      // Keep the cursor in the text when a button is pressed. Menus and the colour box need real focus.
      onMouseDown={(e) => {
        if (!(e.target as Element).closest("select, input")) e.preventDefault();
      }}
      style={{ visibility: "hidden" }}
      className={`fixed z-30 border border-slate-300 bg-white p-2.5 shadow-xl ${
        narrow ? "inset-x-0 bottom-0 rounded-t-xl" : "w-[22.5rem] rounded-lg"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-slate-600">
          Applies to <strong className="font-semibold text-brand">{info.all}</strong>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => edit(resetTextStyle(target))} className="text-slate-600 hover:underline">
            Reset
          </button>
          <button type="button" aria-label="Close style bar" onClick={onClose} className="px-1 text-base leading-none text-slate-500 hover:text-slate-900">
            ×
          </button>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label={`Font for ${info.all}`}
          className={selectClass}
          value={style.font ?? ""}
          onChange={(e) => edit(setTextStyle(target, { font: (e.target.value || null) as FontId | null }))}
        >
          <option value="">Theme font</option>
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          aria-label={`Size for ${info.all}`}
          className={selectClass}
          value={style.scale}
          onChange={(e) => edit(setTextStyle(target, { scale: Number(e.target.value) }))}
        >
          {SCALES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {FLAGS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-label={`${info.label}: ${f.label}`}
            title={f.label}
            aria-pressed={style[f.key]}
            onClick={() => edit(setTextStyle(target, { [f.key]: !style[f.key] }))}
            className={`h-7 min-w-7 rounded border px-1 text-xs ${style[f.key] ? "border-brand bg-brand/10 text-brand" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            style={{
              fontWeight: f.key === "bold" ? 700 : undefined,
              fontStyle: f.key === "italic" ? "italic" : undefined,
              textDecoration: f.key === "underline" ? "underline" : undefined,
            }}
          >
            {f.face}
          </button>
        ))}
        <button
          type="button"
          aria-label={`${info.label}: colour`}
          title="Colour"
          aria-expanded={colourOpen}
          onClick={() => setColourOpen(!colourOpen)}
          className="h-7 w-7 rounded border border-slate-300 p-1"
        >
          <span
            className="block h-full w-full rounded-sm"
            style={{ background: style.color ?? "conic-gradient(#ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)" }}
          />
        </button>
      </div>

      {colourOpen && (
        <div className="mt-2">
          <Palette
            label={`${info.label} colour`}
            value={style.color}
            colors={STYLE_COLORS}
            allowAuto
            onChange={(color, key) => edit(setTextStyle(target, { color }), key ? `style-${target}` : undefined)}
          />
        </div>
      )}
    </div>
  );
}
