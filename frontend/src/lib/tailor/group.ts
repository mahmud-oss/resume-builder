/** Resumes in the list, with the link to the original a tailored version was made from. */
export type Listed = { id: string; tailoredFrom: string | null };

export type Group<T extends Listed> = { original: T; versions: T[] };

/**
 * Lists originals in their given order with their tailored versions under them. A version whose original is not
 * in the list (it was deleted, so the link is gone, or it is not shown) is listed on its own like any resume.
 */
export function groupVersions<T extends Listed>(items: T[]): Group<T>[] {
  const ids = new Set(items.map((i) => i.id));
  const groups: Group<T>[] = [];
  const byOriginal = new Map<string, T[]>();
  for (const i of items) {
    if (i.tailoredFrom && ids.has(i.tailoredFrom)) {
      byOriginal.set(i.tailoredFrom, [...(byOriginal.get(i.tailoredFrom) ?? []), i]);
    }
  }
  for (const i of items) {
    if (i.tailoredFrom && ids.has(i.tailoredFrom)) continue;
    groups.push({ original: i, versions: byOriginal.get(i.id) ?? [] });
  }
  return groups;
}
