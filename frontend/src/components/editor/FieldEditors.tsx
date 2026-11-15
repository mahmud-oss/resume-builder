"use client";

import type { Mutation, FieldTarget } from "@/lib/resume/mutations";
import {
  addCustomField,
  applyEdit,
  removeCustomField,
  toggleCustomFieldHidden,
  toggleFieldHidden,
} from "@/lib/resume/mutations";
import type { FieldDef } from "@/lib/resume/schemas";
import { targetForField } from "@/lib/resume/styleTargets";
import type { EditRef, FieldSet, SectionType } from "@/lib/resume/types";
import { editKey } from "@/components/resume/Editable";
import { useState } from "react";

import { EyeIcon, EyeOffIcon, TrashIcon } from "./Icons";
import { StyleControls } from "./StyleControls";
import { useStyleUi } from "./StyleUi";
import { IconButton, inputClass } from "./ui";

/** Applies a change to the document. The key lets quick typing merge into one undo step. */
export type Edit = (mutation: Mutation, coalesceKey?: string) => void;

type Props = {
  fs: FieldSet;
  fields: FieldDef[];
  target: FieldTarget;
  valueRef: (field: string) => EditRef;
  customRef: (id: string) => EditRef;
  edit: Edit;
  /** Prefix that keeps element ids unique when several forms are on screen. */
  idPrefix: string;
  /** What these fields belong to, so each can show the style button of its kind. */
  scope: SectionType | "basics";
};

export function FieldSetEditor({ fs, fields, target, valueRef, customRef, edit, idPrefix, scope }: Props) {
  const styleUi = useStyleUi();
  const [styling, setStyling] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {fields.map((def) => {
        const id = `${idPrefix}-${def.key}`;
        const hidden = !!fs.hiddenFields[def.key];
        const ref = valueRef(def.key);
        const value = fs.values[def.key] ?? "";
        const onChange = (text: string) => edit(applyEdit(ref, text), editKey(ref));
        return (
          <div key={def.key}>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={id} className="text-xs font-medium text-slate-700">
                {def.label}
                {hidden && <span className="ml-1 font-normal text-slate-500">(hidden on CV)</span>}
              </label>
              <div className="flex items-center">
                {styleUi.enabled && (
                  <button
                    type="button"
                    aria-label={`Style ${def.label}`}
                    title="Font and style"
                    aria-expanded={styling === def.key}
                    onClick={() => setStyling(styling === def.key ? null : def.key)}
                    className={`h-6 rounded px-1.5 text-xs font-semibold hover:bg-slate-100 ${styling === def.key ? "bg-slate-100 text-brand" : "text-slate-600"}`}
                  >
                    Aa
                  </button>
                )}
                <IconButton
                  label={hidden ? `Show ${def.label} on CV` : `Hide ${def.label} from CV`}
                  onClick={() => edit(toggleFieldHidden(target, def.key))}
                  className="!h-6 !w-6"
                >
                  {hidden ? <EyeOffIcon /> : <EyeIcon />}
                </IconButton>
              </div>
            </div>
            {styleUi.enabled && styling === def.key && (
              <div className="mb-2">
                <StyleControls
                  target={targetForField(scope, def.key)}
                  style={styleUi.styles[targetForField(scope, def.key)]}
                  edit={edit}
                />
              </div>
            )}
            {def.kind === "text" ? (
              <input
                id={id}
                className={`${inputClass} ${hidden ? "opacity-60" : ""}`}
                value={value}
                placeholder={def.placeholder}
                onChange={(e) => onChange(e.target.value)}
              />
            ) : (
              <textarea
                id={id}
                className={`${inputClass} ${hidden ? "opacity-60" : ""}`}
                rows={def.kind === "bullets" ? 4 : 3}
                value={value}
                placeholder={def.placeholder}
                onChange={(e) => onChange(e.target.value)}
              />
            )}
          </div>
        );
      })}

      {fs.custom.map((c) => {
        const id = `${idPrefix}-custom-${c.id}`;
        const ref = customRef(c.id);
        const name = scope === "basics" ? "Your detail" : "Extra detail";
        return (
          <div key={c.id}>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={id} className="text-xs font-medium text-slate-700">
                {name}
                {c.hidden && <span className="ml-1 font-normal text-slate-500">(hidden on CV)</span>}
              </label>
              <div className="flex items-center">
                <IconButton
                  label={c.hidden ? `Show ${name} on CV` : `Hide ${name} from CV`}
                  onClick={() => edit(toggleCustomFieldHidden(target, c.id))}
                  className="!h-6 !w-6"
                >
                  {c.hidden ? <EyeOffIcon /> : <EyeIcon />}
                </IconButton>
                <IconButton label={`Remove ${name}`} onClick={() => edit(removeCustomField(target, c.id))} className="!h-6 !w-6">
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
            <input
              id={id}
              className={`${inputClass} ${c.hidden ? "opacity-60" : ""}`}
              placeholder={scope === "basics" ? "e.g. Nationality: Bangladeshi" : "e.g. GPA: 3.8"}
              value={c.value}
              onChange={(e) => edit(applyEdit(ref, e.target.value), editKey(ref))}
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => edit(addCustomField(target))}
        className="text-xs font-medium text-brand hover:underline"
      >
        + Add your own detail
      </button>
    </div>
  );
}

