"use client";

import Link from "next/link";

import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { sampleDoc } from "@/lib/resume/doc";
import { getTemplate } from "@/lib/resume/templates";

export function TemplatePreview({ templateId }: { templateId: string }) {
  const template = getTemplate(templateId);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/templates" className="text-sm text-slate-600 hover:underline">
            ← All templates
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{template.name}</h1>
          <p className="text-slate-600">{template.description}</p>
        </div>
        <Link
          href={`/new?template=${template.id}`}
          className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Use this template
        </Link>
      </div>
      <div className="rounded-lg bg-slate-200 p-4">
        <ResumeCanvas doc={sampleDoc(template.id)} mode="preview" />
      </div>
      <p className="mt-3 text-center text-sm text-slate-500">Sample content. Yours will replace it.</p>
    </main>
  );
}
