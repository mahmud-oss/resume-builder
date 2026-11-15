"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { ApiError, resumeApi } from "@/lib/api";
import { docFromServer } from "@/lib/resume/doc";
import type { ResumeDoc } from "@/lib/resume/types";

import { Editor } from "./Editor";

function Load({ id }: { id: string }) {
  const [doc, setDoc] = useState<ResumeDoc | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    let alive = true;
    resumeApi
      .get(id)
      .then((r) => alive && setDoc(docFromServer(r)))
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof ApiError ? { status: e.status, message: e.message } : { status: 0, message: "Something went wrong." });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="p-10">
        <p className="text-red-700">{error.status === 404 ? "We could not find that resume." : error.message}</p>
        <Link href="/dashboard" className="mt-3 inline-block font-medium text-brand hover:underline">
          Back to my resumes
        </Link>
      </div>
    );
  }
  if (!doc) return <div className="p-10 text-slate-500">Loading your resume…</div>;
  return <Editor id={id} initial={doc} />;
}

export function EditorPage({ id }: { id: string }) {
  return (
    <RequireAuth>
      <Load id={id} />
    </RequireAuth>
  );
}
