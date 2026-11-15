import type { Design, SectionType } from "./types";
import { DEFAULT_DESIGN } from "./design";

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
  /** Page margins in pixels. */
  margin: { top: number; side: number };
  /** Starting design for new resumes made with this template. */
  design: Design;
};

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Single column, plain and ATS-safe.",
    layout: "single",
    header: "center",
    heading: "rule",
    margin: { top: 48, side: 56 },
    design: { ...DEFAULT_DESIGN, font: "source-serif", accent: "#1f2937", fontSize: 10.5 },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Coloured sidebar for contact details and skills.",
    layout: "sidebar",
    header: "left",
    heading: "bar",
    sidebarSections: ["skills", "languages", "certifications"],
    margin: { top: 0, side: 0 },
    design: { ...DEFAULT_DESIGN, font: "inter", accent: "#2563eb", fontSize: 10 },
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tight one-page layout that fits a lot.",
    layout: "single",
    header: "left",
    heading: "plain",
    margin: { top: 36, side: 44 },
    design: { ...DEFAULT_DESIGN, font: "lato", accent: "#0f766e", fontSize: 9.5, spacing: "compact" },
  },
  {
    id: "creative",
    name: "Creative",
    description: "Bold coloured header for design-led profiles.",
    layout: "single",
    header: "banner",
    heading: "bar",
    margin: { top: 0, side: 48 },
    design: { ...DEFAULT_DESIGN, font: "open-sans", accent: "#7c3aed", fontSize: 10.5 },
  },
  {
    id: "executive",
    name: "Executive",
    description: "Spacious serif layout for long careers and academic CVs.",
    layout: "single",
    header: "left",
    heading: "caps",
    margin: { top: 56, side: 64 },
    design: { ...DEFAULT_DESIGN, font: "merriweather", accent: "#1f2937", fontSize: 10, spacing: "relaxed" },
  },
];

export const DEFAULT_TEMPLATE_ID = "classic";

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
