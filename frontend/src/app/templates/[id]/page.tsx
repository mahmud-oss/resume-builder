import { Suspense } from "react";
import { notFound } from "next/navigation";

import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { TEMPLATES } from "@/lib/resume/templates";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ id: t.id }));
}

async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!TEMPLATES.some((t) => t.id === id)) notFound();
  return <TemplatePreview templateId={id} />;
}

export default function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-slate-500">Loading…</div>}>
      <Preview params={params} />
    </Suspense>
  );
}
