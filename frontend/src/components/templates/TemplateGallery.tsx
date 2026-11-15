"use client";

import Link from "next/link";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { sampleDoc } from "@/lib/resume/doc";
import { TEMPLATES } from "@/lib/resume/templates";

export function TemplateGallery() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATES.map((template) => (
        <div key={template.id} className="flex flex-col">
          <Link
            href={`/templates/${template.id}`}
            className="block rounded-lg bg-slate-200 p-3 transition hover:bg-slate-300"
            aria-label={`Preview the ${template.name} template`}
          >
            <ResumeCanvas doc={sampleDoc(template.id)} mode="thumb" />
          </Link>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{template.name}</h2>
              <p className="text-sm text-slate-600">{template.description}</p>
            </div>
            <Link
              href={`/new?template=${template.id}`}
              className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Use this
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
