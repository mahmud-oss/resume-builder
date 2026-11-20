import { resumeApi } from "@/lib/api";
import { DEFAULT_TEMPLATE_ID } from "@/lib/resume/templates";

import { extractionToDoc, titleFor, type Extraction } from "./convert";
import { saveImportReview } from "./review";

/** The file had no CV content we could use. */
export class EmptyCvError extends Error {
  constructor() {
    super("We could not find any CV content in that file. Please try another file.");
  }
}

/**
 * Makes a new resume from a CV the AI has already read, and leaves the notes for the editor to show.
 * Returns the new resume's id. Used by the upload page and by "Import into the builder" on the ATS checker.
 */
export async function createResumeFromExtraction(
  cv: Extraction,
  opts: { fileName: string; demo: boolean; templateId?: string },
): Promise<string> {
  const { doc, notes, empty } = extractionToDoc(cv, opts.templateId ?? DEFAULT_TEMPLATE_ID, titleFor(cv, opts.fileName));
  if (empty) throw new EmptyCvError();
  const created = await resumeApi.create({ title: doc.title, templateId: doc.templateId, data: doc.data, design: doc.design });
  saveImportReview(created.id, { notes, demo: opts.demo });
  return created.id;
}
