import { BASICS_FIELDS, SECTION_SCHEMAS } from "@/lib/resume/schemas";
import type { ResumeDoc } from "@/lib/resume/types";

/**
 * The CV as the assistant sees it: compact, readable, and without the photo. Sections and entries get short
 * references ("experience", "experience.1") that the assistant uses to say what to change; `resolve*`
 * turn them back into real ids.
 */

export type Snapshot = Record<string, unknown>;

type SectionRef = { ref: string; sectionId: string };

function sectionRefs(doc: ResumeDoc): SectionRef[] {
  const seen: Record<string, number> = {};
  return doc.data.sections
    .filter((s) => !s.hidden)
    .map((s) => {
      seen[s.type] = (seen[s.type] ?? 0) + 1;
      return { ref: seen[s.type] === 1 ? s.type : `${s.type}.${seen[s.type]}`, sectionId: s.id };
    });
}

export function buildSnapshot(doc: ResumeDoc): Snapshot {
  const basics: Record<string, string> = {};
  for (const f of BASICS_FIELDS) basics[f.key] = doc.data.basics.values[f.key] ?? "";
  const refs = sectionRefs(doc);

  return {
    template: doc.templateId,
    basics,
    customDetails: doc.data.basics.custom.map((c) => c.value).filter((v) => v.trim() !== ""),
    sections: refs.map(({ ref, sectionId }) => {
      const section = doc.data.sections.find((s) => s.id === sectionId)!;
      const schema = SECTION_SCHEMAS[section.type];
      return {
        ref,
        type: section.type,
        title: section.title,
        fields: schema.fields.map((f) => ({ key: f.key, label: f.label, kind: f.kind })),
        entries: section.items
          .filter((i) => !i.hidden)
          .map((item, index) => ({
            ref: `${ref}.${index + 1}`,
            values: Object.fromEntries(schema.fields.map((f) => [f.key, item.values[f.key] ?? ""])),
          })),
      };
    }),
  };
}

export function resolveSection(doc: ResumeDoc, ref: string): string | null {
  return sectionRefs(doc).find((r) => r.ref === ref)?.sectionId ?? null;
}

/** "experience.2" -> that entry's section and item ids, counting only the entries the snapshot showed. */
export function resolveEntry(doc: ResumeDoc, ref: string): { sectionId: string; itemId: string } | null {
  const dot = ref.lastIndexOf(".");
  if (dot < 0) return null;
  const index = Number(ref.slice(dot + 1));
  const sectionId = resolveSection(doc, ref.slice(0, dot));
  if (!sectionId || !Number.isInteger(index) || index < 1) return null;
  const section = doc.data.sections.find((s) => s.id === sectionId);
  const item = section?.items.filter((i) => !i.hidden)[index - 1];
  return item ? { sectionId, itemId: item.id } : null;
}
