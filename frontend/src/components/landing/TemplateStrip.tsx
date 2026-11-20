"use client";

import Link from "next/link";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { sampleDoc } from "@/lib/resume/doc";
import { TEMPLATES } from "@/lib/resume/templates";

/** A few of the real templates, drawn by the same code as the editor, each linking to its preview. */
export function TemplateStrip() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
      {TEMPLATES.slice(0, 3).map((t) => (
        <Link key={t.id} href={`/templates/${t.id}`} className="group block" aria-label={`Preview the ${t.name} template`}>
          <div className="rounded-lg bg-slate-200 p-3 transition group-hover:bg-slate-300">
            <ResumeCanvas doc={sampleDoc(t.id)} mode="thumb" />
          </div>
          <p className="mt-2 font-semibold">{t.name}</p>
          <p className="text-sm text-slate-600">{t.description}</p>
        </Link>
      ))}
    </div>
  );
}
