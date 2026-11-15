import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorPage } from "@/components/editor/EditorPage";

export const metadata: Metadata = { title: "Editor" };

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorPage id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-slate-500">Loading…</div>}>
      <Editor params={params} />
    </Suspense>
  );
}
