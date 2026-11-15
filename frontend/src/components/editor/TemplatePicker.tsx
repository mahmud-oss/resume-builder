"use client";

import { useMemo } from "react";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { sampleDoc } from "@/lib/resume/doc";
import { setTemplate } from "@/lib/resume/mutations";
import { TEMPLATES } from "@/lib/resume/templates";

import type { Edit } from "./FieldEditors";

function TemplateThumb({ id }: { id: string }) {
  const doc = useMemo(() => sampleDoc(id), [id]);
  return <ResumeCanvas doc={doc} mode="thumb" />;
}

export function TemplatePicker({ templateId, edit }: { templateId: string; edit: Edit }) {
  return (
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
  );
}
