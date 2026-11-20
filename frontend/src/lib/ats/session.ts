import type { AtsFileResponse } from "./types";

/**
 * An uploaded CV is read by the AI once and kept here for the rest of the browser session, so checking it
 * again (or using it in another tool) does not read it again. It lives only in this tab's session storage:
 * never sent anywhere, gone when the tab is closed.
 */

const KEY = "rb.ats.file";

export type CachedFile = { fileName: string; response: AtsFileResponse };

export function saveCachedFile(file: CachedFile) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(file));
  } catch {
    /* storage blocked or full: the file will simply be read again next time */
  }
}

export function readCachedFile(): CachedFile | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<CachedFile>;
    if (typeof v.fileName !== "string" || !v.response || typeof v.response !== "object") return null;
    return v as CachedFile;
  } catch {
    return null;
  }
}

export function clearCachedFile() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
