"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { ProBadge } from "@/components/app/ProBadge";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PRO_HINT } from "@/lib/pro";
import { aiApi, ApiError } from "@/lib/api";
import { DEFAULT_TEMPLATE_ID, getTemplate, TEMPLATES } from "@/lib/resume/templates";
import { fileProblem, UPLOAD_ACCEPT } from "@/lib/upload/file";
import { createResumeFromExtraction, EmptyCvError } from "@/lib/upload/import";

function Upload() {
  const router = useRouter();
  const params = useSearchParams();
  const [templateId, setTemplateId] = useState(getTemplate(params.get("template") ?? DEFAULT_TEMPLATE_ID).id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function convert(file: File | undefined) {
    if (!file || busy) return;
    const problem = fileProblem(file);
    if (problem) return setError(problem);
    setError(null);
    try {
      setBusy("Reading your CV… this can take up to a minute.");
      const { cv, demo } = await aiApi.upload(file);
      setBusy("Creating your resume…");
      const id = await createResumeFromExtraction(cv, { fileName: file.name, demo, templateId });
      router.replace(`/editor/${id}`);
    } catch (e) {
      setBusy(null);
      setError(e instanceof ApiError || e instanceof EmptyCvError ? e.message : "Something went wrong. Please try again.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        Upload your CV <ProBadge />
      </h1>
      <p className="mt-1 text-xs text-slate-500">{PRO_HINT}</p>
      <p className="mt-2 text-slate-600">
        Already have a CV? Upload it and we will turn it into an editable resume, so you do not have to type it again.
        You can fix anything afterwards. CVs in English or Bangla both work; the new resume is in English.
      </p>

      <label htmlFor="upload-template" className="mt-6 block text-sm font-medium text-slate-700">
        Template
      </label>
      <select
        id="upload-template"
        value={templateId}
        disabled={!!busy}
        onChange={(e) => setTemplateId(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 sm:w-64"
      >
        {TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-500">You can change the template later without losing anything.</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void convert(e.dataTransfer.files?.[0]);
        }}
        className={`mt-6 rounded-lg border-2 border-dashed p-10 text-center transition ${over ? "border-brand bg-blue-50" : "border-slate-300 bg-white"}`}
      >
        {busy ? (
          <p role="status" className="text-slate-700">
            {busy}
          </p>
        ) : (
          <>
            <p className="text-slate-700">Drop your CV here, or</p>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="mt-3 rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90"
            >
              Choose a file
            </button>
            <p className="mt-3 text-xs text-slate-500">PDF or Word (.docx) · up to 4 MB · up to 4 pages</p>
          </>
        )}
        <input ref={input} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => void convert(e.target.files?.[0])} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <ul className="mt-6 space-y-1 text-sm text-slate-600">
        <li>Your file is read once to make the resume and is not stored.</li>
        <li>The text of your CV is sent to our AI provider (Anthropic) to read it. Please do not upload anything you are not happy to share.</li>
        <li>The AI can make mistakes. We list what to check, but please read the whole resume before you use it.</li>
      </ul>

      <p className="mt-8 text-sm">
        <Link href="/templates" className="text-brand hover:underline">
          Or start from a blank template instead
        </Link>
      </p>
    </main>
  );
}

export function UploadResume() {
  return (
    <RequireAuth>
      <Upload />
    </RequireAuth>
  );
}
