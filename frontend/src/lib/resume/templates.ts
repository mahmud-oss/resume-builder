import type { Design, SectionType, StyleTarget, TextStyle } from "./types";
import { DEFAULT_DESIGN, DEFAULT_STYLES } from "./design";
import { ADDABLE_SECTIONS } from "./schemas";

/**
 * A template is data, not code: it chooses a layout and a few style options, and one shared
 * renderer draws all of them. Adding a template means adding an entry here.
 */
export type TemplateConfig = {
  id: string;
  name: string;
  description: string;
  /** "single" is one column; "sidebar" puts some sections in a narrow left column. */
  layout: "single" | "sidebar";
  header: "left" | "center" | "banner";
  heading: "rule" | "caps" | "bar" | "plain";
  /** Sections drawn in the sidebar (sidebar layout only). */
  sidebarSections?: SectionType[];
  /** Section types the user may put in either column of a sidebar template (they remember which). */
  bothColumns?: SectionType[];
  /** Page margins in pixels. */
  margin: { top: number; side: number };
  /** Starting design for new resumes made with this template (the first theme). */
  design: Design;
  /** Two or three ready-made looks for this template. The first is the default. */
  themes: Theme[];
};

export type Theme = { id: string; name: string; design: Design };

type StylePatch = Partial<Record<StyleTarget, Partial<TextStyle>>>;

/** Builds a design from the shared defaults plus what this theme changes. */
function look(patch: Partial<Omit<Design, "styles">> & { styles?: StylePatch }): Design {
  const styles = { ...DEFAULT_STYLES };
  for (const [k, v] of Object.entries(patch.styles ?? {})) {
    styles[k as StyleTarget] = { ...styles[k as StyleTarget], ...v };
  }
  return { ...DEFAULT_DESIGN, ...patch, styles };
}

function themes(list: [string, Design][]): Theme[] {
  return list.map(([name, design]) => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name, design }));
}

function withThemes(list: [string, Design][]): { themes: Theme[]; design: Design } {
  const t = themes(list);
  return { themes: t, design: t[0].design };
}

const CAPS: StylePatch = { heading: { uppercase: true } };

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Single column, plain and ATS-safe.",
    layout: "single",
    header: "center",
    heading: "rule",
    margin: { top: 48, side: 56 },
    ...withThemes([
      ["Classic Serif", look({ font: "source-serif", accent: "#1f2937", styles: CAPS })],
      ["Navy Formal", look({ font: "merriweather", accent: "#1e3a8a", textColor: "#111827", fontSize: 10, styles: { ...CAPS, subtitle: { italic: false } } })],
      ["Clean Sans", look({ font: "lato", accent: "#0f766e", styles: { name: { uppercase: true }, heading: { uppercase: false } } })],
    ]),
  },
  {
    id: "modern",
    name: "Modern",
    description: "Coloured sidebar for contact details and skills.",
    layout: "sidebar",
    header: "left",
    heading: "bar",
    sidebarSections: ["skills", "languages", "certifications"],
    bothColumns: ["custom"],
    margin: { top: 0, side: 0 },
    ...withThemes([
      ["Blue Sidebar", look({ font: "inter", accent: "#2563eb", fontSize: 10 })],
      ["Forest", look({ font: "open-sans", accent: "#166534", textColor: "#14532d", fontSize: 10 })],
      ["Charcoal", look({ font: "lato", accent: "#374151", textColor: "#111827", fontSize: 10, styles: { headline: { italic: true }, heading: { uppercase: true } } })],
    ]),
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tight one-page layout that fits a lot.",
    layout: "single",
    header: "left",
    heading: "plain",
    margin: { top: 36, side: 44 },
    ...withThemes([
      ["Teal", look({ font: "lato", accent: "#0f766e", fontSize: 9.5, spacing: "compact" })],
      ["Ink", look({ font: "inter", accent: "#111827", textColor: "#111827", fontSize: 9.5, spacing: "compact", styles: { heading: { uppercase: true, underline: true } } })],
      ["Plum", look({ font: "open-sans", accent: "#86198f", fontSize: 9.5, spacing: "compact", styles: { subtitle: { italic: false } } })],
    ]),
  },
  {
    id: "creative",
    name: "Creative",
    description: "Bold coloured header for design-led profiles.",
    layout: "single",
    header: "banner",
    heading: "bar",
    margin: { top: 0, side: 48 },
    ...withThemes([
      ["Violet", look({ font: "open-sans", accent: "#7c3aed" })],
      ["Sunset", look({ font: "lato", accent: "#c2410c", textColor: "#422006", styles: { name: { uppercase: true } } })],
      ["Ocean", look({ font: "inter", accent: "#0369a1", textColor: "#0f172a", styles: { headline: { italic: true } } })],
    ]),
  },
  {
    id: "executive",
    name: "Executive",
    description: "Spacious serif layout for long careers and academic CVs.",
    layout: "single",
    header: "left",
    heading: "caps",
    margin: { top: 56, side: 64 },
    ...withThemes([
      ["Charcoal", look({ font: "merriweather", accent: "#1f2937", fontSize: 10, spacing: "relaxed", styles: CAPS })],
      ["Burgundy", look({ font: "source-serif", accent: "#7f1d1d", textColor: "#450a0a", fontSize: 10.5, spacing: "relaxed", styles: CAPS })],
      ["Royal", look({ font: "merriweather", accent: "#1e3a8a", fontSize: 10, spacing: "relaxed", styles: { heading: { uppercase: false, italic: true } } })],
    ]),
  },
];

/** True when a section of this type may sit in the given column of the template. */
function allowedIn(template: TemplateConfig, type: SectionType, column: "main" | "side"): boolean {
  if (template.layout !== "sidebar") return column === "main";
  const sideOnly = template.sidebarSections?.includes(type) ?? false;
  const both = template.bothColumns?.includes(type) ?? false;
  return column === "side" ? sideOnly || both : !sideOnly;
}

/**
 * The section types a column offers. One-column templates have only "main". On a sidebar template the
 * sidebar types are offered in the sidebar only, the other types in the main column only, and the types
 * in `bothColumns` in either.
 */
export function sectionTypesFor(template: TemplateConfig, column: "main" | "side"): SectionType[] {
  return ADDABLE_SECTIONS.filter((t) => allowedIn(template, t, column));
}

/**
 * The column a section is drawn in. A remembered choice wins when this template allows it; otherwise the
 * type decides.
 */
export function columnOf(template: TemplateConfig, section: { type: SectionType; column?: "main" | "side" }): "main" | "side" {
  if (template.layout !== "sidebar") return "main";
  if (section.column && allowedIn(template, section.type, section.column)) return section.column;
  return template.sidebarSections?.includes(section.type) ? "side" : "main";
}

/** What to store on a new section so it stays in the column it was added to: only when its type alone would not put it there. */
export function columnToStore(template: TemplateConfig, type: SectionType, column: "main" | "side"): "main" | "side" | undefined {
  const byType = template.sidebarSections?.includes(type) ? "side" : "main";
  return template.layout === "sidebar" && column !== byType ? column : undefined;
}

export const DEFAULT_TEMPLATE_ID = "classic";

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/**
 * The sections next to this one in its own column, in document order. Moving a section swaps it with
 * its neighbour in the same column, so the move is always visible.
 */
export function sectionNeighbours(
  template: TemplateConfig,
  sections: readonly { id: string; type: SectionType; column?: "main" | "side" }[],
  id: string,
): { prevId?: string; nextId?: string } {
  const me = sections.find((s) => s.id === id);
  if (!me) return {};
  const mine = columnOf(template, me);
  const column = sections.filter((s) => columnOf(template, s) === mine);
  const at = column.findIndex((s) => s.id === id);
  return { prevId: column[at - 1]?.id, nextId: column[at + 1]?.id };
}
