"use client";

import { useEffect, useState } from "react";

import { docFromServer } from "@/lib/resume/doc";
import type { ResumeDoc } from "@/lib/resume/types";

import { ResumeCanvas } from "./ResumeCanvas";

declare global {
  interface Window {
    /** Set by the PDF exporter before the page loads. */
    __RESUME_DOC__?: unknown;
  }
}

export function PrintView() {
  const [doc, setDoc] = useState<ResumeDoc | null>(null);

  useEffect(() => {
    const raw = window.__RESUME_DOC__;
    if (raw && typeof raw === "object") {
      // Same repair step as everywhere else, so a damaged resume still prints.
      Promise.resolve().then(() => setDoc(docFromServer(raw as Parameters<typeof docFromServer>[0])));
    }
  }, []);

  if (!doc) return null;

  return (
    <>
      <style>{`html, body { background: #fff !important; margin: 0; }`}</style>
      <ResumeCanvas doc={doc} mode="print" />
    </>
  );
}
