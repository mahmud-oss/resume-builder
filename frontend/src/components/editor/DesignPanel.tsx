"use client";

import { useMemo, useState } from "react";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { STYLE_TARGETS } from "@/lib/resume/design";
import { sampleDoc } from "@/lib/resume/doc";
import { setTemplate } from "@/lib/resume/mutations";
import { TEMPLATES } from "@/lib/resume/templates";
import type { Design, StyleTarget, TextStyle } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";
import { StyleControls } from "./StyleControls";
import { ThemeCustomiser } from "./ThemeCustomiser";
import { ThemePicker } from "./ThemePicker";

function TemplateThumb({ id }: { id: string }) {
  const doc = useMemo(() => sampleDoc(id), [id]);
  return <ResumeCanvas doc={doc} mode="thumb" />;
}

function StyleRow({ target, label, style, edit }: { target: StyleTarget; label: string; style: TextStyle; edit: Edit }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-slate-400"
      >
        <span>{label}</span>
        <span className="text-xs text-slate-500">{open ? "Close" : "Edit style"}</span>
      </button>
      {open && (
        <div className="mt-1">
          <StyleControls target={target} style={style} edit={edit} />
        </div>
      )}
    </li>
  );
}

/** `showParts` lists every styleable part here (version A). Versions B and C style from the form or the preview instead. */
export function DesignPanel({
  templateId,
  design,
  edit,
  showParts,
  showCustomise,
  showTheme,
}: {
  templateId: string;
  design: Design;
  edit: Edit;
  showParts: boolean;
  /** Colours, font and spacing. Version B shows these on the Content tab instead. */
  showCustomise: boolean;
  /** The theme list. Version B shows it on the Content tab instead. */
  showTheme: boolean;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-semibold">Template</h2>
        <p className="mb-3 text-xs text-slate-500">
          Switching keeps everything you wrote and any fields you hid. The look changes to the new template&apos;s first theme.
        </p>
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

      {showTheme && (
        <section>
          <h2 className="mb-2 font-semibold">Theme</h2>
          <ThemePicker templateId={templateId} design={design} edit={edit} />
          <p className="mt-2 text-xs text-slate-500">Pick a theme, then change any colour or style.</p>
        </section>
      )}

      {showCustomise && <ThemeCustomiser design={design} edit={edit} />}


      {showParts && (
        <section>
          <h2 className="mb-1 font-semibold">Text styles</h2>
          <p className="mb-3 text-xs text-slate-500">
            Each style applies to every text of that kind, for example all job titles. Auto uses the theme&apos;s colour.
          </p>
          <ul className="space-y-2">
            {STYLE_TARGETS.map((t) => (
              <StyleRow key={t.id} target={t.id} label={t.label} style={design.styles[t.id]} edit={edit} />
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
