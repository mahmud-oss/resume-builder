"use client";

import { ACCENT_PALETTE, FONT_SIZES, FONTS, SPACINGS, TEXT_PALETTE } from "@/lib/resume/design";
import { setDesign } from "@/lib/resume/mutations";
import type { Design, FontId, SpacingId } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";
import { Palette } from "./Palette";
import { inputClass } from "./ui";

/** Colours, main font, text size and spacing: everything that customises the chosen theme. */
export function ThemeCustomiser({ design, edit }: { design: Design; edit: Edit }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-semibold">Contact details</h2>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={design.contactIcons}
            onChange={(e) => edit(setDesign({ contactIcons: e.target.checked }))}
          />
          <span>
            Show small icons beside phone, email, location and links
            <span className="block text-xs text-slate-500">You can change each icon, or remove it, in the page editor.</span>
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Colours</h2>
        <div>
          <div className="mb-1 text-xs font-medium text-slate-700">Accent (headings, lines, sidebar)</div>
          <Palette
            label="Accent colour"
            value={design.accent}
            colors={ACCENT_PALETTE}
            onChange={(c, key) => c && edit(setDesign({ accent: c }), key && "accent")}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-slate-700">Text colour</div>
          <Palette
            label="Text colour"
            value={design.textColor}
            colors={TEXT_PALETTE}
            onChange={(c, key) => c && edit(setDesign({ textColor: c }), key && "textColor")}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Main font and spacing</h2>

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
      </section>
    </div>
  );
}
