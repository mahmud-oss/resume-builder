"use client";

import { useMemo } from "react";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { ACCENT_PRESETS, FONT_SIZES, FONTS, SPACINGS } from "@/lib/resume/design";
import { sampleDoc } from "@/lib/resume/doc";
import { setDesign, setTemplate } from "@/lib/resume/mutations";
import { TEMPLATES } from "@/lib/resume/templates";
import type { Design, FontId, SpacingId } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";
import { inputClass } from "./ui";

function TemplateThumb({ id }: { id: string }) {
  const doc = useMemo(() => sampleDoc(id), [id]);
  return <ResumeCanvas doc={doc} mode="thumb" />;
}

export function DesignPanel({ templateId, design, edit }: { templateId: string; design: Design; edit: Edit }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-semibold">Template</h2>
        <p className="mb-3 text-xs text-slate-500">Switching keeps everything you wrote and any fields you hid.</p>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === templateId}
              onClick={() => edit(setTemplate(t.id))}
              className={`overflow-hidden rounded-lg border-2 bg-white text-left ${t.id === templateId ? "border-brand" : "border-slate-200 hover:border-slate-400"}`}
            >
              <div className="pointer-events-none">
                <TemplateThumb id={t.id} />
              </div>
              <div className="px-2 py-1.5 text-sm font-medium">{t.name}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Style</h2>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">Font</span>
          <select className={inputClass} value={design.font} onChange={(e) => edit(setDesign({ font: e.target.value as FontId }))}>
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">Text size</span>
          <select className={inputClass} value={design.fontSize} onChange={(e) => edit(setDesign({ fontSize: Number(e.target.value) }))}>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} pt
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-1 text-xs font-medium text-slate-700">Spacing</legend>
          <div className="flex gap-2">
            {SPACINGS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={design.spacing === s.id}
                onClick={() => edit(setDesign({ spacing: s.id as SpacingId }))}
                className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${design.spacing === s.id ? "border-brand bg-brand/10 font-medium text-brand" : "border-slate-300 hover:bg-slate-50"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-xs font-medium text-slate-700">Accent colour</legend>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Accent colour ${c}`}
                aria-pressed={design.accent.toLowerCase() === c}
                onClick={() => edit(setDesign({ accent: c }))}
                style={{ background: c }}
                className={`h-7 w-7 rounded-full ring-offset-2 ${design.accent.toLowerCase() === c ? "ring-2 ring-slate-900" : ""}`}
              />
            ))}
            <label className="ml-1 flex items-center gap-1 text-xs text-slate-600">
              Custom
              <input
                type="color"
                value={design.accent}
                onChange={(e) => edit(setDesign({ accent: e.target.value }), "accent")}
                className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              />
            </label>
          </div>
        </fieldset>
      </section>
    </div>
  );
}
