/**
 * Bullet points are stored as one text with a line per point. These helpers split and merge
 * lines when the user presses Enter or Backspace inside a point on the page.
 */

export type LineEdit = { value: string; /** Which line should receive the cursor next. */ focusIndex: number };

/** Enter inside line `index` at `offset`: the text after the cursor becomes a new line below. */
export function splitLineAt(value: string, index: number, offset: number): LineEdit {
  const lines = value.split("\n");
  const line = lines[index] ?? "";
  const at = Math.max(0, Math.min(offset, line.length));
  lines.splice(index, 1, line.slice(0, at), line.slice(at));
  return { value: lines.join("\n"), focusIndex: index + 1 };
}

/** Backspace at the start of line `index`: it joins onto the line above. Null for the first line. */
export function mergeLineUp(value: string, index: number): LineEdit | null {
  if (index <= 0) return null;
  const lines = value.split("\n");
  if (index >= lines.length) return null;
  lines.splice(index - 1, 2, (lines[index - 1] ?? "") + lines[index]);
  return { value: lines.join("\n"), focusIndex: index - 1 };
}
