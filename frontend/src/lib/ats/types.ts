import type { Design, ResumeData, SectionType } from "@/lib/resume/types";

/**
 * The ATS checker's shapes (PRD ATS-08, ATS-09). A finding is one thing to tell the user; the rules turn a
 * resume (and, for an uploaded file, what the server found about the file) into findings and a band.
 */

export type Severity = "critical" | "warning" | "note" | "ok";

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  /** Why it matters or what exactly was found. */
  detail?: string;
  /** What to do about it. */
  fix?: string;
  /** Where in the resume it is, so the page can say where to look. */
  where?: SectionType | "basics";
};

/** "Estimate" bands, never a percentage (ATS-05). */
export type Band = "strong" | "good" | "fair" | "needs-work";

/** What the server says about an uploaded file itself. */
export type FileFinding = { id: string; severity: "critical" | "warning" | "note"; title: string; detail: string };
export type FileMeta = { kind: "pdf" | "docx"; pages: number | null; words: number };
export type FileReport = { meta: FileMeta; findings: FileFinding[] };

export type AtsInput = {
  data: ResumeData;
  /** Saved resumes only: the template and design in use. */
  templateId?: string;
  design?: Design;
  /** Uploaded files only. */
  file?: FileReport;
};

export type AtsResult = {
  band: Band;
  findings: Finding[];
  counts: Record<Severity, number>;
  words: number;
  pages: number;
  /** True when the page count is worked out from the word count, not read from a file. */
  pagesEstimated: boolean;
};

/** The server's answer for an uploaded file. */
export type AtsFileResponse = { cv: import("@/lib/upload/convert").Extraction; meta: FileMeta; findings: FileFinding[]; demo: boolean };

/** One piece of writing feedback from the AI (checked by the server before it gets here). */
export type ReviewItem = { entry: string; field: string; original: string; issue: string; suggestion: string };
export type ReviewResponse = { summary: string; items: ReviewItem[]; demo: boolean };
