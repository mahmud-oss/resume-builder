"use client";

import { fontFamily, sameDesign } from "@/lib/resume/design";
import { applyDesign } from "@/lib/resume/mutations";
import { getTemplate } from "@/lib/resume/templates";
import type { Design } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";

/** The ready-made looks for the current template. The one that matches the current design is marked. */
export function ThemePicker({ templateId, design, edit }: { templateId: string; design: Design; edit: Edit }) {
  const template = getTemplate(templateId);
  return (
    <ul className="space-y-2" aria-label="Themes">
      {template.themes.map((t) => {
        const selected = sameDesign(design, t.design);
        return (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => edit(applyDesign(t.design))}
              className={`flex w-full items-center gap-3 rounded-lg border-2 bg-white px-3 py-2 text-left ${selected ? "border-brand" : "border-slate-200 hover:border-slate-400"}`}
            >
              <span className="flex -space-x-1">
                <span className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: t.design.accent }} />
                <span className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: t.design.textColor }} />
              </span>
              <span className="flex-1 text-sm font-medium">{t.name}</span>
              <span className="text-lg" style={{ fontFamily: fontFamily(t.design.font), color: t.design.accent }}>
                Aa
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
