import type { Design, FontId, SpacingId, StyleTarget, TextStyle } from "./types";

/**
 * Design controls are limited to ranges that keep a template intact: a short font list,
 * a few text sizes and three spacing steps. Accent colour is free because it cannot break layout.
 */

export const FONTS: { id: FontId; label: string; cssVar: string; fallback: string }[] = [
  { id: "inter", label: "Inter", cssVar: "--font-inter", fallback: "sans-serif" },
  { id: "lato", label: "Lato", cssVar: "--font-lato", fallback: "sans-serif" },
  { id: "open-sans", label: "Open Sans", cssVar: "--font-open-sans", fallback: "sans-serif" },
  { id: "merriweather", label: "Merriweather", cssVar: "--font-merriweather", fallback: "serif" },
  { id: "source-serif", label: "Source Serif", cssVar: "--font-source-serif", fallback: "serif" },
];

export const FONT_SIZES = [9, 9.5, 10, 10.5, 11, 11.5, 12] as const;

export const SPACINGS: { id: SpacingId; label: string; factor: number }[] = [
  { id: "compact", label: "Compact", factor: 0.75 },
  { id: "normal", label: "Normal", factor: 1 },
  { id: "relaxed", label: "Relaxed", factor: 1.3 },
];

/** Colours offered for headings, rules and sidebars. */
export const ACCENT_PALETTE = [
  "#1f2937",
  "#374151",
  "#1e3a8a",
  "#2563eb",
  "#0369a1",
  "#0f766e",
  "#166534",
  "#4d7c0f",
  "#7c3aed",
  "#86198f",
  "#be123c",
  "#7f1d1d",
  "#c2410c",
  "#92400e",
];

/** Colours offered for text: dark enough to stay readable on white. */
export const TEXT_PALETTE = [
  "#000000",
  "#111827",
  "#1f2937",
  "#374151",
  "#4b5563",
  "#1e3a8a",
  "#14532d",
  "#450a0a",
  "#3b0764",
  "#422006",
];

export const STYLE_TARGETS: { id: StyleTarget; label: string; all: string }[] = [
  { id: "name", label: "Your name", all: "your name" },
  { id: "headline", label: "Professional title", all: "your professional title" },
  { id: "contact", label: "Contact details", all: "all contact details" },
  { id: "heading", label: "Section headings", all: "all section headings" },
  { id: "itemTitle", label: "Job, degree and project titles", all: "all job, degree and project titles" },
  { id: "subtitle", label: "Company and school", all: "all company and school lines" },
  { id: "location", label: "Location", all: "all locations" },
  { id: "dates", label: "Dates", all: "all dates" },
  { id: "bullets", label: "Bullet points and details", all: "all bullet points and details" },
  { id: "summary", label: "Summary text", all: "the summary text" },
  { id: "skillLabel", label: "Skill and language names", all: "all skill and language names" },
  { id: "skillValue", label: "Skill and language details", all: "all skill and language details" },
];

/** Size steps relative to each part's normal size. */
export const SCALES: { value: number; label: string }[] = [
  { value: 0.85, label: "Small" },
  { value: 1, label: "Normal" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Extra large" },
];

const plain: TextStyle = { font: null, scale: 1, bold: false, italic: false, underline: false, uppercase: false, color: null };

export const DEFAULT_STYLES: Record<StyleTarget, TextStyle> = {
  name: { ...plain, bold: true },
  headline: { ...plain },
  contact: { ...plain },
  heading: { ...plain, bold: true },
  itemTitle: { ...plain, bold: true },
  subtitle: { ...plain, italic: true },
  location: { ...plain, italic: true },
  dates: { ...plain },
  bullets: { ...plain },
  summary: { ...plain },
  skillLabel: { ...plain, bold: true },
  skillValue: { ...plain },
};

export const DEFAULT_TEXT_COLOR = "#1f2937";

export const DEFAULT_DESIGN: Design = {
  font: "inter",
  fontSize: 10.5,
  accent: "#2563eb",
  textColor: DEFAULT_TEXT_COLOR,
  spacing: "normal",
  styles: DEFAULT_STYLES,
  contactIcons: false,
};

/** Mixes a hex colour towards another by `amount` (0 to 1). Used for secondary text. */
export function mix(hex: string, towards: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(towards.slice(1), 16);
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function fontFamily(id: FontId): string {
  const font = FONTS.find((f) => f.id === id) ?? FONTS[0];
  return `var(${font.cssVar}), ${font.fallback}`;
}

export function spacingFactor(id: SpacingId): number {
  return (SPACINGS.find((s) => s.id === id) ?? SPACINGS[1]).factor;
}

/** Accepts whatever the server stored and returns a valid design, filling gaps from `base`. */
export function normaliseDesign(raw: unknown, base: Design = DEFAULT_DESIGN): Design {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const font = FONTS.some((f) => f.id === r.font) ? (r.font as FontId) : base.font;
  const fontSize =
    typeof r.fontSize === "number" && FONT_SIZES.includes(r.fontSize as (typeof FONT_SIZES)[number])
      ? r.fontSize
      : base.fontSize;
  const accent = typeof r.accent === "string" && HEX.test(r.accent) ? r.accent : base.accent;
  const textColor = typeof r.textColor === "string" && HEX.test(r.textColor) ? r.textColor : base.textColor;
  const spacing = SPACINGS.some((s) => s.id === r.spacing) ? (r.spacing as SpacingId) : base.spacing;
  const contactIcons = typeof r.contactIcons === "boolean" ? r.contactIcons : base.contactIcons;
  return { font, fontSize, accent, textColor, spacing, styles: normaliseStyles(r.styles, base.styles), contactIcons };
}

function normaliseStyles(raw: unknown, base: Design["styles"]): Design["styles"] {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as Design["styles"];
  for (const { id } of STYLE_TARGETS) {
    const s = (r[id] && typeof r[id] === "object" ? r[id] : {}) as Record<string, unknown>;
    const b = base[id];
    const flag = (k: "bold" | "italic" | "underline" | "uppercase") => (typeof s[k] === "boolean" ? (s[k] as boolean) : b[k]);
    const color =
      s.color === null ? null : typeof s.color === "string" && HEX.test(s.color) ? s.color : b.color;
    const font = s.font === null ? null : FONTS.some((f) => f.id === s.font) ? (s.font as FontId) : b.font;
    const scale = SCALES.some((x) => x.value === s.scale) ? (s.scale as number) : b.scale;
    out[id] = {
      font,
      scale,
      bold: flag("bold"),
      italic: flag("italic"),
      underline: flag("underline"),
      uppercase: flag("uppercase"),
      color,
    };
  }
  return out;
}

/** True when two designs look identical. */
export function sameDesign(a: Design, b: Design): boolean {
  return JSON.stringify(normaliseDesign(a)) === JSON.stringify(normaliseDesign(b));
}
