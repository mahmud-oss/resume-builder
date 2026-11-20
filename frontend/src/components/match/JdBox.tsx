"use client";

import { MAX_JD_CHARS, saveJd } from "@/lib/jd";

/** The job description box, shared by every tool that needs one. The text is kept for the browser session. */
export function JdBox({ id = "jd", value, onChange, label = "Job description" }: { id?: string; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={8}
        maxLength={MAX_JD_CHARS}
        placeholder="Paste the job description here (English or Bangla)"
        onChange={(e) => {
          onChange(e.target.value);
          saveJd(e.target.value);
        }}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <p className="mt-1 text-xs text-slate-500">
        {value.length.toLocaleString("en")} / {MAX_JD_CHARS.toLocaleString("en")} characters. Kept in this browser tab only and
        sent to our AI provider (Anthropic) when you run a check.
      </p>
    </div>
  );
}
