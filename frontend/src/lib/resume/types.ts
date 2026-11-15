/**
 * The resume data record. It is independent of the template: switching template never
 * changes or loses anything stored here. Visibility (hidden flags) belongs to the data,
 * so a field the user hid stays hidden in every template.
 */

export type CustomField = {
  id: string;
  label: string;
  value: string;
  hidden?: boolean;
};

/** A group of named values: the resume header, or one entry inside a section. */
export type FieldSet = {
  values: Record<string, string>;
  hiddenFields: Record<string, boolean>;
  custom: CustomField[];
};

export type Item = FieldSet & {
  id: string;
  hidden?: boolean;
};

export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "languages"
  | "references"
  | "custom";

export type Section = {
  id: string;
  type: SectionType;
  title: string;
  hidden?: boolean;
  /** Start this section on a new page (manual page break). */
  pageBreakBefore?: boolean;
  items: Item[];
};

export type Basics = FieldSet & {
  /** A small square JPEG as a data URL, or null. */
  photo: string | null;
};

export type ResumeData = {
  basics: Basics;
  sections: Section[];
};

export type FontId = "inter" | "lato" | "open-sans" | "merriweather" | "source-serif";
export type SpacingId = "compact" | "normal" | "relaxed";

/** The parts of a CV that can be styled as a group. */
export type StyleTarget =
  | "name"
  | "headline"
  | "contact"
  | "heading"
  | "itemTitle"
  | "subtitle"
  | "location"
  | "dates"
  | "bullets"
  | "summary"
  | "skillLabel"
  | "skillValue";

export type TextStyle = {
  /** Font for this part, or null to use the design's main font. */
  font: FontId | null;
  /** Size relative to this part's normal size. */
  scale: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  /** Hex colour, or null to use the template's default for this part. */
  color: string | null;
};

export type Design = {
  font: FontId;
  /** Body text size in points. */
  fontSize: number;
  /** Section headings, rules and the sidebar/banner colour. */
  accent: string;
  /** Main text colour. */
  textColor: string;
  spacing: SpacingId;
  styles: Record<StyleTarget, TextStyle>;
};

/** Everything the editor works on and autosaves. */
export type ResumeDoc = {
  title: string;
  templateId: string;
  data: ResumeData;
  design: Design;
};

/** Points to one piece of editable text, so the preview can edit the data directly. */
export type EditRef =
  | { kind: "basics"; field: string }
  | { kind: "basicsCustom"; id: string; part: "label" | "value" }
  | { kind: "item"; sectionId: string; itemId: string; field: string }
  | { kind: "itemCustom"; sectionId: string; itemId: string; id: string; part: "label" | "value" }
  | { kind: "sectionTitle"; sectionId: string };
