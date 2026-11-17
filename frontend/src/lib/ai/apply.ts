import { newId } from "@/lib/resume/defaults";
import { addItem, addSection, applyEdit, type Mutation } from "@/lib/resume/mutations";
import { ADDABLE_SECTIONS, BASICS_FIELDS, SECTION_SCHEMAS } from "@/lib/resume/schemas";
import type { ResumeDoc, SectionType } from "@/lib/resume/types";

import { resolveEntry, resolveSection } from "./snapshot";
import type { AiUpdate, ServerDraft } from "./types";

/**
 * Turns what the assistant says into changes to the CV. Anything it gets wrong (a field that does not exist,
 * an entry that is not there) is skipped, never guessed at, and reported so it can be noticed.
 */

const BASICS_KEYS: ReadonlySet<string> = new Set(BASICS_FIELDS.map((f) => f.key));

function isBlank(values: Record<string, string>): boolean {
  return Object.values(values).every((v) => v.trim() === "");
}

type Step = { doc: ResumeDoc; note?: string; rejected?: string };

function applyOne(doc: ResumeDoc, u: AiUpdate): Step {
  switch (u.action) {
    case "set_basics": {
      if (!BASICS_KEYS.has(u.field)) return { doc, rejected: `unknown contact field "${u.field}"` };
      const label = BASICS_FIELDS.find((f) => f.key === u.field)!.label;
      return { doc: applyEdit({ kind: "basics", field: u.field }, u.value)(doc), note: label };
    }

    case "set_field": {
      const at = resolveEntry(doc, u.entry);
      if (!at) return { doc, rejected: `no entry "${u.entry}"` };
      const section = doc.data.sections.find((s) => s.id === at.sectionId)!;
      const def = SECTION_SCHEMAS[section.type].fields.find((f) => f.key === u.field);
      if (!def) return { doc, rejected: `no field "${u.field}" in ${section.type}` };
      return { doc: applyEdit({ kind: "item", sectionId: at.sectionId, itemId: at.itemId, field: u.field }, u.value)(doc), note: def.label };
    }

    case "add_entry": {
      const sectionId = resolveSection(doc, u.section);
      if (!sectionId) return { doc, rejected: `no section "${u.section}"` };
      const section = doc.data.sections.find((s) => s.id === sectionId)!;
      const schema = SECTION_SCHEMAS[section.type];
      const valid = u.values.filter((kv) => schema.fields.some((f) => f.key === kv.field));
      // A new CV starts with one empty entry per section: fill that one before adding another.
      const first = section.items[0];
      const reuse = section.items.length === 1 && first && isBlank(first.values) && first.custom.length === 0 ? first.id : null;
      let next = doc;
      let itemId = reuse;
      if (!itemId) {
        itemId = newId();
        next = addItem(sectionId, itemId)(next);
      }
      for (const kv of valid) {
        next = applyEdit({ kind: "item", sectionId, itemId, field: kv.field }, kv.value)(next);
      }
      return { doc: next, note: `a new ${schema.itemLabel}` };
    }

    case "add_section": {
      const type = u.section as SectionType;
      if (!ADDABLE_SECTIONS.includes(type)) return { doc, rejected: `unknown section type "${u.section}"` };
      if (type !== "custom" && doc.data.sections.some((s) => s.type === type && !s.hidden)) {
        return { doc, rejected: `the CV already has ${type}` };
      }
      return { doc: addSection(type)(doc), note: `a ${SECTION_SCHEMAS[type].label} section` };
    }
  }
}

export type AppliedUpdates = {
  mutation: Mutation;
  /** What was put into the CV, for a short note under the assistant's message. */
  notes: string[];
  /** What could not be applied and why. Not shown to the user; kept so problems can be seen. */
  rejected: string[];
};

/**
 * One mutation for all of a turn's updates, so a single Undo takes the whole turn back. Because the
 * references are read against the CV as it is when applied, later updates can use entries added earlier.
 */
export function planUpdates(doc: ResumeDoc, updates: AiUpdate[]): AppliedUpdates {
  const notes: string[] = [];
  const rejected: string[] = [];
  let working = doc;
  for (const u of updates) {
    const step = applyOne(working, u);
    working = step.doc;
    if (step.note) notes.push(step.note);
    if (step.rejected) rejected.push(step.rejected);
  }
  const result = working;
  return { mutation: (current) => (current === doc ? result : replay(current, updates)), notes: [...new Set(notes)], rejected };
}

/** The CV changed while the assistant was thinking: apply the updates again to what is there now. */
function replay(doc: ResumeDoc, updates: AiUpdate[]): ResumeDoc {
  return updates.reduce((d, u) => applyOne(d, u).doc, doc);
}

/** Puts an accepted draft into its field. Null when the entry or field is gone. */
export function draftMutation(doc: ResumeDoc, draft: Pick<ServerDraft, "entry" | "field">, text: string): Mutation | null {
  const at = resolveEntry(doc, draft.entry);
  if (!at) return null;
  const section = doc.data.sections.find((s) => s.id === at.sectionId)!;
  if (!SECTION_SCHEMAS[section.type].fields.some((f) => f.key === draft.field)) return null;
  return applyEdit({ kind: "item", sectionId: at.sectionId, itemId: at.itemId, field: draft.field }, text);
}

/** The text a draft would replace, or "" if the field is empty or gone. */
export function currentText(doc: ResumeDoc, draft: Pick<ServerDraft, "entry" | "field">): string {
  const at = resolveEntry(doc, draft.entry);
  if (!at) return "";
  const section = doc.data.sections.find((s) => s.id === at.sectionId);
  return section?.items.find((i) => i.id === at.itemId)?.values[draft.field] ?? "";
}
