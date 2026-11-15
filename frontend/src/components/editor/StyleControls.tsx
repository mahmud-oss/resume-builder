"use client";

import { ACCENT_PALETTE, FONTS, SCALES, STYLE_TARGETS, TEXT_PALETTE } from "@/lib/resume/design";
import { resetTextStyle, setTextStyle } from "@/lib/resume/mutations";
import type { StyleTarget, TextStyle } from "@/lib/resume/types";
import type { FontId } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";
import { Palette } from "./Palette";

export const FLAGS: { key: "bold" | "italic" | "underline" | "uppercase"; label: string; face: string }[] = [
  { key: "bold", label: "Bold", face: "B" },
  { key: "italic", label: "Italic", face: "I" },
  { key: "underline", label: "Underline", face: "U" },
  { key: "uppercase", label: "Capitals", face: "AA" },
];

export const STYLE_COLORS = [...TEXT_PALETTE.slice(1), ...ACCENT_PALETTE.slice(3, 13)];

const select =
  "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

/**
 * Font, size, bold/italic/underline/capitals and colour for one kind of text.
 * The same controls are used by all three editor versions; only where they appear differs.
 */
export function StyleControls({ target, style, edit }: { target: StyleTarget; style: TextStyle; edit: Edit }) {
  const info = STYLE_TARGETS.find((t) => t.id === target)!;
  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2.5" role="group" aria-label={`Style ${info.all}`}>
      <p className="text-xs font-medium text-slate-700">
        Style applies to <span className="text-brand">{info.all}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="sr-only" htmlFor={`font-${target}`}>
          Font for {info.all}
        </label>
        <select
          id={`font-${target}`}
          className={select}
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
        <label className="sr-only" htmlFor={`size-${target}`}>
          Size for {info.all}
        </label>
        <select
          id={`size-${target}`}
          className={select}
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
      </div>
      <Palette
        label={`${info.label} colour`}
        value={style.color}
        colors={STYLE_COLORS}
        allowAuto
        onChange={(color, key) => edit(setTextStyle(target, { color }), key ? `style-${target}` : undefined)}
      />
      <button type="button" onClick={() => edit(resetTextStyle(target))} className="text-xs text-slate-600 hover:underline">
        Reset to theme
      </button>
    </div>
  );
}
