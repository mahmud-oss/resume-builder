import { docFromServer } from "../resume/doc";
import type { ResumeDoc } from "../resume/types";

/** Largest request we accept. A resume with a photo is well under this. */
export const MAX_BODY_BYTES = 3_000_000;

export type ParsedExport = { ok: true; doc: ResumeDoc } | { ok: false; status: number; error: string };

/**
 * Checks the body of an export request: `{ doc: { title, templateId, data, design } }`. The document is
 * passed through the same repair step the editor uses, so a damaged one still prints.
 */
export function parseExportRequest(raw: unknown): ParsedExport {
  if (!raw || typeof raw !== "object") return { ok: false, status: 400, error: "The request body must be a JSON object." };
  const doc = (raw as Record<string, unknown>).doc;
  if (!doc || typeof doc !== "object") return { ok: false, status: 400, error: "The request must contain a CV document." };
  const d = doc as Record<string, unknown>;
  if (typeof d.title !== "string" || typeof d.templateId !== "string") {
    return { ok: false, status: 400, error: "The CV needs a title and a template." };
  }
  if (d.title.length > 200) return { ok: false, status: 400, error: "The CV title is too long." };
  if (!d.data || typeof d.data !== "object") return { ok: false, status: 400, error: "The CV has no content." };
  return { ok: true, doc: docFromServer({ title: d.title, templateId: d.templateId, data: d.data, design: d.design }) };
}

/** A safe file name for the download, ending in .pdf. Falls back to "Resume". */
export function pdfFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 80)
    .trim();
  return `${cleaned || "Resume"}.pdf`;
}

/** The value of a Content-Disposition header for a download with this name (works for any language). */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** The file name from a Content-Disposition header made by contentDisposition(), or null. */
export function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* fall through to the plain name */
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
}
