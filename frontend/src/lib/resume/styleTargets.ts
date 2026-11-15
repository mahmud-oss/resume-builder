import { SECTION_SCHEMAS } from "./schemas";
import type { EditRef, ResumeDoc, SectionType, StyleTarget } from "./types";

/**
 * Which styled part a field belongs to. Every field of the same kind shares one style,
 * so changing one job title changes them all.
 */
export function targetForField(scope: SectionType | "basics", key: string): StyleTarget {
  if (scope === "basics") {
    if (key === "fullName") return "name";
    if (key === "headline") return "headline";
    return "contact";
  }
  const schema = SECTION_SCHEMAS[scope];
  if (schema.layout === "rows") return key === schema.rowLabel ? "skillLabel" : "skillValue";
  if (schema.layout === "text") return "summary";
  if (key === schema.title) return "itemTitle";
  if (key === "location") return "location";
  if (key === schema.dateStart || key === schema.dateEnd) return "dates";
  if (key === schema.body) return "bullets";
  return "subtitle";
}

/** The styled part behind a piece of text in the preview, or null if it has none. */
export function targetForRef(doc: ResumeDoc, ref: EditRef): StyleTarget | null {
  switch (ref.kind) {
    case "basics":
      return targetForField("basics", ref.field);
    case "basicsCustom":
      return "contact";
    case "sectionTitle":
      return "heading";
    case "item": {
      const section = doc.data.sections.find((s) => s.id === ref.sectionId);
      return section ? targetForField(section.type, ref.field) : null;
    }
    case "itemCustom":
      return "subtitle";
  }
}
