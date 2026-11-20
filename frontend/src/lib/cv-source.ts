import { buildSnapshot, type Snapshot } from "@/lib/ai/snapshot";
import type { AtsFileResponse } from "@/lib/ats/types";
import { fingerprint } from "@/lib/match/session";
import { extractionToDoc } from "@/lib/upload/convert";
import type { ResumeDoc } from "@/lib/resume/types";

/**
 * The CV a tool is working on: one of the user's saved resumes, or a file they uploaded (which the AI has
 * already read once). Every tool turns it into the same compact snapshot, so they all see the same text.
 */
export type CvSourceValue =
  | { kind: "saved"; id: string; title: string; doc: ResumeDoc }
  | { kind: "file"; fileName: string; response: AtsFileResponse };

/** The resume document: the saved one, or one made from what was read out of the file (not saved anywhere). */
export function docOf(v: CvSourceValue): ResumeDoc {
  return v.kind === "saved" ? v.doc : extractionToDoc(v.response.cv, "classic", v.fileName).doc;
}

export function snapshotOf(v: CvSourceValue): Snapshot {
  return buildSnapshot(docOf(v));
}

/** Changes whenever the CV's text changes, so cached results never outlive the text they were made for. */
export function keyOf(v: CvSourceValue): string {
  return fingerprint(JSON.stringify(snapshotOf(v)));
}

export function labelOf(v: CvSourceValue): string {
  return v.kind === "saved" ? v.title || "Untitled resume" : v.fileName;
}
