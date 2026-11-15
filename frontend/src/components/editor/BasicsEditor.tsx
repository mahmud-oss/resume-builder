"use client";

import { useRef, useState } from "react";

import { PhotoError, processPhoto } from "@/lib/resume/photo";
import { setPhoto } from "@/lib/resume/mutations";
import { BASICS_FIELDS } from "@/lib/resume/schemas";
import type { Basics } from "@/lib/resume/types";

import { FieldSetEditor, type Edit } from "./FieldEditors";

function PhotoField({ photo, edit }: { photo: string | null; edit: Edit }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      edit(setPhoto(await processPhoto(file)));
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : "Could not use that image.");
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs text-slate-500">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo ? <img src={photo} alt="Your photo" className="h-full w-full object-cover" /> : "No photo"}
      </div>
      <div>
        <div className="flex gap-3 text-sm">
          <button type="button" onClick={() => input.current?.click()} className="font-medium text-brand hover:underline">
            {photo ? "Change photo" : "Upload photo"}
          </button>
          {photo && (
            <button type="button" onClick={() => edit(setPhoto(null))} className="text-slate-600 hover:underline">
              Remove
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Optional. JPG, PNG or WebP, up to 5 MB. Shown only on templates that have a photo.</p>
        {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      </div>
    </div>
  );
}

export function BasicsEditor({ basics, edit }: { basics: Basics; edit: Edit }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-semibold">Personal details</h2>
      <PhotoField photo={basics.photo} edit={edit} />
      <FieldSetEditor
        fs={basics}
        fields={BASICS_FIELDS}
        target={{ kind: "basics" }}
        valueRef={(field) => ({ kind: "basics", field })}
        customRef={(id) => ({ kind: "basicsCustom", id })}
        edit={edit}
        idPrefix="basics"
        scope="basics"
      />
    </section>
  );
}
