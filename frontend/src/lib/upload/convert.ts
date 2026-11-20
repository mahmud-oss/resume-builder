import { newId } from "@/lib/resume/defaults";
import { BASICS_FIELDS, SECTION_SCHEMAS } from "@/lib/resume/schemas";
import type { Item, ResumeData, ResumeDoc, Section, SectionType } from "@/lib/resume/types";
import { newDoc } from "@/lib/resume/doc";

/**
 * Turns what the server read from an uploaded CV into the editor's data. The server's answer is checked
 * here against the editor's own field definitions: a section or field that does not exist is not guessed
 * at, and its text is kept in an "Other" section so nothing from the file is lost.
 */

export type ExtractedEntry = { fields: { field: string; value: string }[] };
export type ExtractedSection = { type: string; title: string; entries: ExtractedEntry[] };
export type Extraction = {
  basics: Record<string, string>;
  sections: ExtractedSection[];
  other: string;
  reviewNotes: string[];
};
export type UploadResponse = { cv: Extraction; demo: boolean };

export const OTHER_TITLE = "Other information";

function isSectionType(t: string): t is SectionType {
  return t in SECTION_SCHEMAS;
}

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export type Converted = { data: ResumeData; notes: string[]; empty: boolean };

export function extractionToData(e: Extraction): Converted {
  const leftovers: string[] = [];
  const otherText = clean(e.other);
  if (otherText) leftovers.push(...otherText.split("\n").map((l) => l.trim()).filter(Boolean));

  // Contact details.
  const basicsValues: Record<string, string> = {};
  for (const f of BASICS_FIELDS) {
    const v = clean(e.basics?.[f.key]);
    if (v) basicsValues[f.key] = v;
  }

  // Sections: same type merges into the first of that type (except custom sections, which stay separate).
  const sections: Section[] = [];
  for (const s of Array.isArray(e.sections) ? e.sections : []) {
    const type = clean(s.type);
    if (!isSectionType(type)) {
      for (const entry of s.entries ?? []) for (const f of entry.fields ?? []) if (clean(f.value)) leftovers.push(`${clean(f.field)}: ${clean(f.value)}`);
      continue;
    }
    const schema = SECTION_SCHEMAS[type];
    const keys = new Set(schema.fields.map((f) => f.key));
    const items: Item[] = [];
    for (const entry of Array.isArray(s.entries) ? s.entries : []) {
      const values: Record<string, string> = {};
      for (const f of Array.isArray(entry.fields) ? entry.fields : []) {
        const key = clean(f.field);
        const value = clean(f.value);
        if (!value) continue;
        if (keys.has(key)) values[key] = values[key] ? `${values[key]}\n${value}` : value;
        else leftovers.push(`${key}: ${value}`);
      }
      if (Object.keys(values).length > 0) items.push({ id: newId(), values, hiddenFields: {}, custom: [] });
    }
    if (items.length === 0) continue;

    const existing = type === "custom" ? undefined : sections.find((x) => x.type === type);
    if (existing) {
      existing.items.push(...items);
      continue;
    }
    sections.push({ id: newId(), type, title: clean(s.title) || schema.label, items });
  }

  // A summary is a single paragraph: join extra entries into it.
  for (const section of sections) {
    if (SECTION_SCHEMAS[section.type].singleItem && section.items.length > 1) {
      const key = SECTION_SCHEMAS[section.type].fields[0].key;
      const joined = section.items.map((i) => i.values[key] ?? "").filter(Boolean).join("\n\n");
      section.items = [{ ...section.items[0], values: { [key]: joined } }];
    }
  }

  // Text that fits nowhere is kept, never dropped.
  if (leftovers.length > 0) {
    sections.push({
      id: newId(),
      type: "custom",
      title: OTHER_TITLE,
      items: [{ id: newId(), values: { details: leftovers.join("\n") }, hiddenFields: {}, custom: [] }],
    });
  }

  const notes = (Array.isArray(e.reviewNotes) ? e.reviewNotes : []).map(clean).filter(Boolean);
  const empty = Object.keys(basicsValues).length === 0 && sections.length === 0;
  return {
    data: { basics: { values: basicsValues, hiddenFields: {}, custom: [], photo: null }, sections },
    notes,
    empty,
  };
}

/** The new resume for an upload: the chosen template's own design, with the file's content. */
export function extractionToDoc(e: Extraction, templateId: string, title: string): { doc: ResumeDoc; notes: string[]; empty: boolean } {
  const { data, notes, empty } = extractionToData(e);
  const base = newDoc(templateId, title);
  return { doc: { ...base, data }, notes, empty };
}

/** A name for the new resume: the person's name if the file gave one, otherwise the file's name. */
export function titleFor(e: Extraction, fileName: string): string {
  const person = clean(e.basics?.fullName);
  if (person) return `${person} – CV`.slice(0, 200);
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return (base || "Uploaded CV").slice(0, 200);
}
