import { BASICS_FIELDS, SECTION_SCHEMAS } from "./schemas";
import type { Basics, CustomField, FieldSet, Item, ResumeData, Section, SectionType } from "./types";

export function newId(): string {
  return crypto.randomUUID();
}

export function emptyFieldSet(): FieldSet {
  return { values: {}, hiddenFields: {}, custom: [] };
}

export function newItem(values: Record<string, string> = {}): Item {
  return { id: newId(), ...emptyFieldSet(), values };
}

export function newSection(type: SectionType, title?: string): Section {
  const schema = SECTION_SCHEMAS[type];
  return { id: newId(), type, title: title ?? schema.label, items: [newItem()] };
}

/** A new resume starts with the sections most people need; everything else can be added. */
export function emptyData(): ResumeData {
  return {
    basics: { ...emptyFieldSet(), photo: null },
    sections: (["summary", "experience", "education", "projects", "skills", "languages"] as SectionType[]).map(
      (t) => newSection(t),
    ),
  };
}

// ---------------------------------------------------------------------------------------
// Reading data back from the server

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function normaliseFieldSet(raw: unknown): FieldSet {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const values: Record<string, string> = {};
  if (r.values && typeof r.values === "object") {
    for (const [k, v] of Object.entries(r.values as Record<string, unknown>)) values[k] = str(v);
  }
  const hiddenFields: Record<string, boolean> = {};
  if (r.hiddenFields && typeof r.hiddenFields === "object") {
    for (const [k, v] of Object.entries(r.hiddenFields as Record<string, unknown>)) {
      if (v === true) hiddenFields[k] = true;
    }
  }
  const custom: CustomField[] = Array.isArray(r.custom)
    ? r.custom
        .filter((c) => c && typeof c === "object")
        .map((c) => {
          const cf = c as Record<string, unknown>;
          return {
            id: str(cf.id) || newId(),
            label: str(cf.label),
            value: str(cf.value),
            ...(cf.hidden === true ? { hidden: true } : {}),
          };
        })
    : [];
  return { values, hiddenFields, custom };
}

/** Accepts whatever the server stored and always returns a valid resume. */
export function normaliseData(raw: unknown): ResumeData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawBasics = (r.basics && typeof r.basics === "object" ? r.basics : {}) as Record<string, unknown>;
  const basics: Basics = {
    ...normaliseFieldSet(rawBasics),
    photo: typeof rawBasics.photo === "string" && rawBasics.photo.startsWith("data:image/") ? rawBasics.photo : null,
  };

  if (!Array.isArray(r.sections)) return { basics, sections: emptyData().sections };

  const sections: Section[] = r.sections
    .filter((s) => s && typeof s === "object" && str((s as Record<string, unknown>).type) in SECTION_SCHEMAS)
    .map((s) => {
      const sec = s as Record<string, unknown>;
      const type = str(sec.type) as SectionType;
      const items: Item[] = Array.isArray(sec.items)
        ? sec.items
            .filter((i) => i && typeof i === "object")
            .map((i) => {
              const it = i as Record<string, unknown>;
              return {
                id: str(it.id) || newId(),
                ...normaliseFieldSet(it),
                ...(it.hidden === true ? { hidden: true } : {}),
              };
            })
        : [];
      return {
        id: str(sec.id) || newId(),
        type,
        title: str(sec.title) || SECTION_SCHEMAS[type].label,
        ...(sec.hidden === true ? { hidden: true } : {}),
        ...(sec.pageBreakBefore === true ? { pageBreakBefore: true } : {}),
        items: items.length > 0 ? items : [newItem()],
      };
    });
  return { basics, sections };
}

// ---------------------------------------------------------------------------------------
// Emptiness

export function fieldSetHasContent(fs: FieldSet, keys: string[]): boolean {
  return keys.some((k) => (fs.values[k] ?? "").trim() !== "") || fs.custom.some((c) => c.value.trim() !== "");
}

export function itemHasContent(type: SectionType, item: Item): boolean {
  return fieldSetHasContent(
    item,
    SECTION_SCHEMAS[type].fields.map((f) => f.key),
  );
}

/** True when the user has not entered anything yet. */
export function isBlank(data: ResumeData): boolean {
  if (data.basics.photo) return false;
  if (fieldSetHasContent(data.basics, BASICS_FIELDS.map((f) => f.key))) return false;
  return !data.sections.some((s) => s.items.some((i) => itemHasContent(s.type, i)));
}

// ---------------------------------------------------------------------------------------
// Sample data: shown for blank resumes and in the template gallery. Ids are fixed so server
// and browser render the same thing.

function sampleItem(id: string, values: Record<string, string>): Item {
  return { id, ...emptyFieldSet(), values };
}

export const SAMPLE_DATA: ResumeData = {
  basics: {
    ...emptyFieldSet(),
    photo: null,
    values: {
      fullName: "Tanvir Ahmed",
      headline: "Software Engineer",
      email: "tanvir.ahmed@example.com",
      phone: "+880 1700-000000",
      location: "Dhaka, Bangladesh",
      linkedin: "linkedin.com/in/tanvir-example",
    },
  },
  sections: [
    {
      id: "s-summary",
      type: "summary",
      title: "Summary",
      items: [
        sampleItem("i-summary", {
          text: "Software engineer with three years of experience building web applications. Comfortable across the stack, with a focus on clean code and reliable delivery.",
        }),
      ],
    },
    {
      id: "s-experience",
      type: "experience",
      title: "Experience",
      items: [
        sampleItem("i-exp-1", {
          role: "Software Engineer",
          company: "Example Technologies",
          location: "Dhaka",
          startDate: "Jan 2023",
          endDate: "Present",
          description:
            "Built and maintained customer-facing web features used by thousands of people\nReduced page load time by improving data queries and caching\nMentored two junior developers",
        }),
        sampleItem("i-exp-2", {
          role: "Junior Developer",
          company: "Sample Software Ltd.",
          location: "Dhaka",
          startDate: "Jun 2021",
          endDate: "Dec 2022",
          description: "Developed internal tools for the support team\nWrote automated tests for core features",
        }),
      ],
    },
    {
      id: "s-education",
      type: "education",
      title: "Education",
      items: [
        sampleItem("i-edu-1", {
          degree: "BSc in Computer Science and Engineering",
          institution: "Example University",
          location: "Dhaka",
          startDate: "2017",
          endDate: "2021",
          details: "CGPA 3.6 / 4.00",
        }),
      ],
    },
    {
      id: "s-projects",
      type: "projects",
      title: "Projects",
      items: [
        sampleItem("i-proj-1", {
          name: "Online Bookshop",
          tech: "React, Java, PostgreSQL",
          description: "Full-stack bookshop with search, cart and secure checkout\nDeployed with automated tests and monitoring",
        }),
      ],
    },
    {
      id: "s-skills",
      type: "skills",
      title: "Skills",
      items: [
        sampleItem("i-skill-1", { category: "Programming", skills: "Java, JavaScript, TypeScript, SQL" }),
        sampleItem("i-skill-2", { category: "Tools", skills: "Git, Docker, Linux" }),
      ],
    },
    {
      id: "s-languages",
      type: "languages",
      title: "Languages",
      items: [
        sampleItem("i-lang-1", { language: "Bangla", level: "Native" }),
        sampleItem("i-lang-2", { language: "English", level: "Professional" }),
      ],
    },
  ],
};
