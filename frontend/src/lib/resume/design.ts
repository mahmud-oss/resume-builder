import type { Design, FontId, SpacingId } from "./types";

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

export const ACCENT_PRESETS = ["#1f2937", "#2563eb", "#0f766e", "#7c3aed", "#be123c", "#c2410c"];

export const DEFAULT_DESIGN: Design = {
  font: "inter",
  fontSize: 10.5,
  accent: "#2563eb",
  spacing: "normal",
};

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
  const spacing = SPACINGS.some((s) => s.id === r.spacing) ? (r.spacing as SpacingId) : base.spacing;
  return { font, fontSize, accent, spacing };
}
