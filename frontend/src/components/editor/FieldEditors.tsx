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
import type { EditRef, FieldSet } from "@/lib/resume/types";
import { editKey } from "@/components/resume/Editable";

import { EyeIcon, EyeOffIcon, TrashIcon } from "./Icons";
import { IconButton, inputClass } from "./ui";

/** Applies a change to the document. The key lets quick typing merge into one undo step. */
export type Edit = (mutation: Mutation, coalesceKey?: string) => void;

type Props = {
  fs: FieldSet;
  fields: FieldDef[];
  target: FieldTarget;
  valueRef: (field: string) => EditRef;
  customRef: (id: string, part: "label" | "value") => EditRef;
  edit: Edit;
  /** Prefix that keeps element ids unique when several forms are on screen. */
  idPrefix: string;
};

export function FieldSetEditor({ fs, fields, target, valueRef, customRef, edit, idPrefix }: Props) {
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
              <IconButton
                label={hidden ? `Show ${def.label} on CV` : `Hide ${def.label} from CV`}
                onClick={() => edit(toggleFieldHidden(target, def.key))}
                className="!h-6 !w-6"
              >
                {hidden ? <EyeOffIcon /> : <EyeIcon />}
              </IconButton>
            </div>
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

      {fs.custom.map((c) => (
        <div key={c.id} className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="flex items-center gap-1">
            <input
              aria-label="Custom field name"
              className={`${inputClass} font-medium`}
              placeholder="Field name, e.g. Father's name"
              value={c.label}
              onChange={(e) => edit(applyEdit(customRef(c.id, "label"), e.target.value), editKey(customRef(c.id, "label")))}
            />
            <IconButton
              label={c.hidden ? "Show on CV" : "Hide from CV"}
              onClick={() => edit(toggleCustomFieldHidden(target, c.id))}
            >
              {c.hidden ? <EyeOffIcon /> : <EyeIcon />}
            </IconButton>
            <IconButton label="Remove field" onClick={() => edit(removeCustomField(target, c.id))}>
              <TrashIcon />
            </IconButton>
          </div>
          <input
            aria-label={`${c.label || "Custom field"} value`}
            className={`${inputClass} mt-1.5 ${c.hidden ? "opacity-60" : ""}`}
            placeholder="Value"
            value={c.value}
            onChange={(e) => edit(applyEdit(customRef(c.id, "value"), e.target.value), editKey(customRef(c.id, "value")))}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => edit(addCustomField(target))}
        className="text-xs font-medium text-brand hover:underline"
      >
        + Add your own field
      </button>
    </div>
  );
}

