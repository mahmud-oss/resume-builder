import type { SectionType } from "./types";

/**
 * Describes the fields of each kind of section. The form, the preview and the templates
 * are all driven by these definitions, so adding a section type means adding one entry here.
 */

export type FieldKind = "text" | "textarea" | "bullets";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
};

export type SectionSchema = {
  type: SectionType;
  label: string;
  /** Name of one entry, for buttons ("Add experience"). */
  itemLabel: string;
  /** Only ever one entry (for example the summary). */
  singleItem?: boolean;
  fields: FieldDef[];
  /**
   * How the section is drawn:
   * - text:  one paragraph (the field named by `body`)
   * - entry: a heading line, a sub line, dates and a body
   * - rows:  "label: value" lines
   */
  layout: "text" | "entry" | "rows";
  title?: string;
  subtitle?: string[];
  dateStart?: string;
  dateEnd?: string;
  body?: string;
  rowLabel?: string;
  rowValue?: string;
};

export const BASICS_FIELDS: FieldDef[] = [
  { key: "fullName", label: "Full name", kind: "text", placeholder: "Your full name" },
  { key: "headline", label: "Professional title", kind: "text", placeholder: "e.g. Software Engineer" },
  { key: "email", label: "Email", kind: "text" },
  { key: "phone", label: "Phone", kind: "text" },
  { key: "location", label: "Location", kind: "text", placeholder: "City, Country" },
  { key: "website", label: "Website", kind: "text" },
  { key: "linkedin", label: "LinkedIn", kind: "text" },
];

export const SECTION_SCHEMAS: Record<SectionType, SectionSchema> = {
  summary: {
    type: "summary",
    label: "Summary",
    itemLabel: "summary",
    singleItem: true,
    layout: "text",
    body: "text",
    fields: [{ key: "text", label: "Summary", kind: "textarea", placeholder: "A short introduction about you" }],
  },
  experience: {
    type: "experience",
    label: "Experience",
    itemLabel: "experience",
    layout: "entry",
    title: "role",
    subtitle: ["company", "location"],
    dateStart: "startDate",
    dateEnd: "endDate",
    body: "description",
    fields: [
      { key: "role", label: "Job title", kind: "text" },
      { key: "company", label: "Company", kind: "text" },
      { key: "location", label: "Location", kind: "text" },
      { key: "startDate", label: "Start date", kind: "text", placeholder: "Jan 2023" },
      { key: "endDate", label: "End date", kind: "text", placeholder: "Present" },
      { key: "description", label: "What you did", kind: "bullets", placeholder: "One achievement per line" },
    ],
  },
  education: {
    type: "education",
    label: "Education",
    itemLabel: "education",
    layout: "entry",
    title: "degree",
    subtitle: ["institution", "location"],
    dateStart: "startDate",
    dateEnd: "endDate",
    body: "details",
    fields: [
      { key: "degree", label: "Degree", kind: "text", placeholder: "BSc in Computer Science" },
      { key: "institution", label: "Institution", kind: "text" },
      { key: "location", label: "Location", kind: "text" },
      { key: "startDate", label: "Start date", kind: "text" },
      { key: "endDate", label: "End date", kind: "text" },
      { key: "details", label: "Details", kind: "bullets", placeholder: "Result, honours, thesis…" },
    ],
  },
  projects: {
    type: "projects",
    label: "Projects",
    itemLabel: "project",
    layout: "entry",
    title: "name",
    subtitle: ["tech"],
    dateStart: "startDate",
    dateEnd: "endDate",
    body: "description",
    fields: [
      { key: "name", label: "Project name", kind: "text" },
      { key: "tech", label: "Technologies", kind: "text", placeholder: "React, Java, PostgreSQL" },
      { key: "link", label: "Link", kind: "text" },
      { key: "startDate", label: "Start date", kind: "text" },
      { key: "endDate", label: "End date", kind: "text" },
      { key: "description", label: "Description", kind: "bullets", placeholder: "One point per line" },
    ],
  },
  skills: {
    type: "skills",
    label: "Skills",
    itemLabel: "skill group",
    layout: "rows",
    rowLabel: "category",
    rowValue: "skills",
    fields: [
      { key: "category", label: "Category", kind: "text", placeholder: "e.g. Programming" },
      { key: "skills", label: "Skills", kind: "text", placeholder: "Comma-separated" },
    ],
  },
  certifications: {
    type: "certifications",
    label: "Certifications",
    itemLabel: "certification",
    layout: "entry",
    title: "name",
    subtitle: ["issuer"],
    dateStart: "date",
    fields: [
      { key: "name", label: "Certification", kind: "text" },
      { key: "issuer", label: "Issued by", kind: "text" },
      { key: "date", label: "Date", kind: "text" },
    ],
  },
  languages: {
    type: "languages",
    label: "Languages",
    itemLabel: "language",
    layout: "rows",
    rowLabel: "language",
    rowValue: "level",
    fields: [
      { key: "language", label: "Language", kind: "text" },
      { key: "level", label: "Level", kind: "text", placeholder: "e.g. Fluent" },
    ],
  },
  references: {
    type: "references",
    label: "References",
    itemLabel: "reference",
    layout: "entry",
    title: "name",
    subtitle: ["position", "organisation"],
    body: "contact",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "position", label: "Position", kind: "text" },
      { key: "organisation", label: "Organisation", kind: "text" },
      { key: "contact", label: "Phone / email", kind: "textarea" },
    ],
  },
  custom: {
    type: "custom",
    label: "Custom section",
    itemLabel: "entry",
    layout: "entry",
    title: "heading",
    subtitle: ["subheading"],
    dateStart: "dates",
    body: "details",
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "subheading", label: "Sub-heading", kind: "text" },
      { key: "dates", label: "Dates", kind: "text" },
      { key: "details", label: "Details", kind: "bullets" },
    ],
  },
};

/** Section types a user can add from the menu. */
export const ADDABLE_SECTIONS: SectionType[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "languages",
  "references",
  "custom",
];
