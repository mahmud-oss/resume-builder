import { BASICS_FIELDS, SECTION_SCHEMAS, type FieldKind } from "./schemas";
import type { EditRef, ResumeDoc } from "./types";

/**
 * What a tapped piece of text on the page is: its name, kind of input, and current value. The phone
 * editor uses this to show the right input in its bottom sheet.
 */
export type FieldInfo = {
  ref: EditRef;
  /** What to call it ("Job title"). */
  label: string;
  kind: FieldKind;
  value: string;
  /** A short hint under the input, for points that go one per line. */
  hint?: string;
};

/** The reference inside a focus key. A bullet line adds "#n" to its field's key; that is dropped. */
export function parseFocusKey(key: string): EditRef | null {
  try {
    const ref = JSON.parse(key.replace(/#\d+$/, "")) as EditRef;
    return ref && typeof ref === "object" && "kind" in ref ? ref : null;
  } catch {
    return null;
  }
}

/** The key of the whole field a bullet-line key belongs to. */
export function fieldKeyOf(key: string): string {
  return key.replace(/#\d+$/, "");
}

export function describeRef(doc: ResumeDoc, ref: EditRef): FieldInfo | null {
  switch (ref.kind) {
    case "basics": {
      const def = BASICS_FIELDS.find((f) => f.key === ref.field);
      return { ref, label: def?.label ?? ref.field, kind: "text", value: doc.data.basics.values[ref.field] ?? "" };
    }
    case "basicsCustom": {
      const c = doc.data.basics.custom.find((x) => x.id === ref.id);
      return c ? { ref, label: "Your detail", kind: "text", value: c.value } : null;
    }
    case "sectionTitle": {
      const s = doc.data.sections.find((x) => x.id === ref.sectionId);
      return s ? { ref, label: "Section title", kind: "text", value: s.title } : null;
    }
    case "item": {
      const section = doc.data.sections.find((s) => s.id === ref.sectionId);
      const item = section?.items.find((i) => i.id === ref.itemId);
      const def = section && SECTION_SCHEMAS[section.type].fields.find((f) => f.key === ref.field);
      if (!section || !item || !def) return null;
      return {
        ref,
        label: def.label,
        kind: def.kind,
        value: item.values[ref.field] ?? "",
        hint: def.kind === "bullets" ? "One point per line" : undefined,
      };
    }
    case "itemCustom": {
      const section = doc.data.sections.find((s) => s.id === ref.sectionId);
      const c = section?.items.find((i) => i.id === ref.itemId)?.custom.find((x) => x.id === ref.id);
      return c ? { ref, label: "Extra detail", kind: "text", value: c.value } : null;
    }
  }
}

/**
 * The order to step through fields with "next": the page's order from top to bottom, except inside one
 * entry, where the fields follow the form order (job title, company, location, dates, points) rather than
 * where they happen to sit on the page (the dates are on the title's row).
 */
export function orderForForm(keysInPageOrder: string[], doc: ResumeDoc): string[] {
  const entryOf = (ref: EditRef | null): string | null => {
    if (ref && (ref.kind === "item" || ref.kind === "itemCustom")) return `${ref.sectionId}:${ref.itemId}`;
    return null;
  };
  const rank = (ref: EditRef | null): number => {
    if (!ref) return 0;
    if (ref.kind === "itemCustom") return 1000;
    if (ref.kind !== "item") return 0;
    const section = doc.data.sections.find((s) => s.id === ref.sectionId);
    const at = section ? SECTION_SCHEMAS[section.type].fields.findIndex((f) => f.key === ref.field) : -1;
    return at < 0 ? 999 : at;
  };
  const out: string[] = [];
  let run: { key: string; rank: number }[] = [];
  let runEntry: string | null = null;
  const flush = () => {
    out.push(...run.sort((a, b) => a.rank - b.rank).map((r) => r.key));
    run = [];
  };
  for (const key of keysInPageOrder) {
    const ref = parseFocusKey(key);
    const entry = entryOf(ref);
    if (entry !== runEntry) {
      flush();
      runEntry = entry;
    }
    if (entry === null) out.push(key);
    else run.push({ key, rank: rank(ref) });
  }
  flush();
  return out;
}
