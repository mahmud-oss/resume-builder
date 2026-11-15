/**
 * Switches that can be turned off without touching the screens.
 * versionSwitch: shows the A/B/C editor-version switch in the editor header (for testing).
 */
export const FEATURES = {
  versionSwitch: true,
} as const;

/** The editor layouts being compared. A: styles on their own tab. B: a style button beside each field. C: a style bar above the preview. */
export type EditorVersion = "a" | "b" | "c";

export const EDITOR_VERSIONS: { id: EditorVersion; label: string; hint: string }[] = [
  { id: "a", label: "A", hint: "Styles on a separate tab" },
  { id: "b", label: "B", hint: "Style button beside each field" },
  { id: "c", label: "C", hint: "Style bar above the preview" },
];
