"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { resumeApi } from "@/lib/api";
import { newDoc } from "@/lib/resume/doc";

/** Creates an empty resume from the chosen template, then opens it in the editor. */
function Create() {
  const router = useRouter();
  const template = useSearchParams().get("template") ?? undefined;
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in development
    started.current = true;
    const doc = newDoc(template);
    resumeApi
      .create({ title: doc.title, templateId: doc.templateId, data: doc.data, design: doc.design })
      .then((r) => router.replace(`/editor/${r.id}`))
      .catch((e: Error) => setError(e.message));
  }, [template, router]);

  if (error) return <p className="p-10 text-red-700">Could not create your resume: {error}</p>;
  return <div className="p-10 text-slate-500">Creating your resume…</div>;
}

export function NewResume() {
  return (
    <RequireAuth>
      <Create />
    </RequireAuth>
  );
}
