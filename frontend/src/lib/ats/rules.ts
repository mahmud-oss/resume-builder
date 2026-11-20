import { itemHasContent } from "@/lib/resume/defaults";
import { SECTION_SCHEMAS } from "@/lib/resume/schemas";
import { getTemplate } from "@/lib/resume/templates";
import type { Item, ResumeData, Section, SectionType } from "@/lib/resume/types";

import type { AtsInput, AtsResult, Band, Finding, Severity } from "./types";

/**
 * The ATS content rules (PRD ATS-09). Fixed code: no AI, instant and free. They look at what is in the resume
 * (and, for a saved resume, the template's traits). What an uploaded file's layout does to a real ATS is
 * checked by the server and passed in as `file`.
 */

export const LIMITS = {
  summaryMax: 600,
  bulletMax: 220,
  minWords: 150,
  /** About how many words fit on one page of a typical CV. */
  wordsPerPage: 550,
  maxPages: 2,
} as const;

// --- reading the resume --------------------------------------------------------------------------

function visibleSections(data: ResumeData, type?: SectionType): Section[] {
  return data.sections.filter((s) => !s.hidden && (!type || s.type === type));
}

function visibleItems(section: Section): Item[] {
  return section.items.filter((i) => !i.hidden && itemHasContent(section.type, i));
}

function value(item: Item, key: string): string {
  return item.hiddenFields[key] ? "" : (item.values[key] ?? "").trim();
}

function basic(data: ResumeData, key: string): string {
  return data.basics.hiddenFields[key] ? "" : (data.basics.values[key] ?? "").trim();
}

/** Every piece of text that would appear on the page. */
function allText(data: ResumeData): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data.basics.values)) if (!data.basics.hiddenFields[k]) parts.push(v);
  for (const c of data.basics.custom) if (!c.hidden) parts.push(c.value);
  for (const s of visibleSections(data)) {
    for (const item of visibleItems(s)) {
      for (const [k, v] of Object.entries(item.values)) if (!item.hiddenFields[k]) parts.push(v);
      for (const c of item.custom) if (!c.hidden) parts.push(c.value);
    }
  }
  return parts.join("\n");
}

export function countWords(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/** Lines of a bullet field, without bullet symbols. */
function bulletLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•–—·]+|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function bulletFields(type: SectionType): string[] {
  return SECTION_SCHEMAS[type].fields.filter((f) => f.kind === "bullets").map((f) => f.key);
}

// --- date formats ----------------------------------------------------------------------------------

const FULL_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const ABBR_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec"];
const OPEN_ENDED = /^(present|current|now|ongoing|till date|to date|today)$/i;

/**
 * The style of a date, or null when it is empty, open-ended ("Present") or a bare year. A bare year sits fine
 * beside any other style (education is often just years), so only month-level styles can clash.
 */
export function dateStyle(raw: string): string | null {
  const v = raw.trim();
  if (!v || OPEN_ENDED.test(v) || /^\d{4}$/.test(v)) return null;
  const monthName = /^([A-Za-z]+)\.?\s+\d{4}$/.exec(v);
  if (monthName) {
    const m = monthName[1].toLowerCase();
    if (FULL_MONTHS.includes(m)) return "Month name in full (January 2022)";
    if (ABBR_MONTHS.includes(m)) return "Short month name (Jan 2022)";
    return "other";
  }
  if (/^\d{1,2}[/.-]\d{4}$/.test(v)) return "Number and year (01/2022)";
  if (/^\d{4}[/.-]\d{1,2}$/.test(v)) return "Year and number (2022-01)";
  if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(v)) return "Full date (15/01/2022)";
  return "other";
}

function dateValues(data: ResumeData): string[] {
  const out: string[] = [];
  for (const s of visibleSections(data)) {
    const schema = SECTION_SCHEMAS[s.type];
    const keys = [schema.dateStart, schema.dateEnd].filter((k): k is string => !!k);
    for (const item of visibleItems(s)) for (const k of keys) out.push(value(item, k));
  }
  return out;
}

// --- section names -------------------------------------------------------------------------------------

const STANDARD_TITLES: Partial<Record<SectionType, string[]>> = {
  summary: ["summary", "professional summary", "profile", "professional profile", "objective", "career objective", "about me", "personal statement"],
  experience: ["experience", "work experience", "professional experience", "employment", "employment history", "work history", "career history"],
  education: ["education", "education and training", "academic background", "qualifications", "academic qualifications"],
  skills: ["skills", "technical skills", "key skills", "core skills", "skills and tools", "skills summary", "core competencies"],
};

// --- the rules -------------------------------------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BANGLA = /[ঀ-৿]/;

function listOf(items: string[], max = 3): string {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} and ${items.length - max} more` : shown;
}

/** Runs every rule. The same function serves saved resumes and uploaded files. */
export function checkResume(input: AtsInput): AtsResult {
  const { data, file } = input;
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  const text = allText(data);
  const words = file && file.meta.words > 0 ? file.meta.words : countWords(text);

  // Critical: things an ATS cannot work without.
  const name = basic(data, "fullName");
  const email = basic(data, "email");
  const phone = basic(data, "phone");
  const missing: string[] = [];
  if (!name) missing.push("full name");
  if (!email) missing.push("email");
  if (!phone) missing.push("phone number");
  if (missing.length > 0) {
    for (const [label, id] of [["full name", "name"], ["email", "email"], ["phone number", "phone"]] as const) {
      if (!missing.includes(label)) continue;
      add({
        id,
        severity: "critical",
        title: `No ${label}`,
        detail:
          id === "name"
            ? "An ATS builds your profile from your name; without it the CV can be filed under nothing."
            : "Recruiters and the ATS use this to contact you, and many systems reject a CV without it.",
        fix: `Add your ${label} in your contact details.`,
        where: "basics",
      });
    }
  } else {
    add({ id: "contact", severity: "ok", title: "Name, email and phone are all there", where: "basics" });
  }

  const hasExperience = visibleSections(data, "experience").some((s) => visibleItems(s).length > 0);
  const hasEducation = visibleSections(data, "education").some((s) => visibleItems(s).length > 0);
  if (!hasExperience && !hasEducation) {
    add({
      id: "experience-or-education",
      severity: "critical",
      title: "No experience or education",
      detail: "An ATS looks for at least one of these to judge a CV; with neither, it has little to match against a job.",
      fix: "Add your work experience, or your education if you are just starting out.",
      where: "experience",
    });
  } else {
    add({ id: "experience-or-education", severity: "ok", title: hasExperience ? "Work experience is listed" : "Education is listed" });
  }

  // Warnings.
  const summary = visibleSections(data, "summary").flatMap(visibleItems)[0];
  const summaryText = summary ? value(summary, "text") : "";
  if (!summaryText) {
    add({
      id: "summary",
      severity: "warning",
      title: "No summary",
      detail: "A short summary near the top is where an ATS and a recruiter first look for your title and key skills.",
      fix: "Add two or three sentences about who you are and what you do best.",
      where: "summary",
    });
  } else if (summaryText.length > LIMITS.summaryMax) {
    add({
      id: "summary",
      severity: "warning",
      title: "The summary is long",
      detail: `It is ${summaryText.length} characters. Over about ${LIMITS.summaryMax} is hard to skim and pushes your experience down.`,
      fix: "Cut it to two or three sentences.",
      where: "summary",
    });
  } else {
    add({ id: "summary", severity: "ok", title: "The summary is a good length", where: "summary" });
  }

  const noBullets: string[] = [];
  for (const s of visibleSections(data, "experience")) {
    for (const item of visibleItems(s)) {
      if (bulletLines(value(item, "description")).length === 0) noBullets.push(value(item, "role") || value(item, "company") || "an entry");
    }
  }
  if (noBullets.length > 0) {
    add({
      id: "bullets-missing",
      severity: "warning",
      title: "Some jobs have no bullet points",
      detail: `No description for: ${listOf(noBullets)}. An ATS finds keywords in what you did, not just in the job title.`,
      fix: "Add two to five short bullet points to each job.",
      where: "experience",
    });
  } else if (hasExperience) {
    add({ id: "bullets-missing", severity: "ok", title: "Every job has bullet points", where: "experience" });
  }

  let longBullets = 0;
  for (const s of visibleSections(data)) {
    for (const item of visibleItems(s)) {
      for (const key of bulletFields(s.type)) {
        longBullets += bulletLines(value(item, key)).filter((l) => l.length > LIMITS.bulletMax).length;
      }
    }
  }
  if (longBullets > 0) {
    add({
      id: "bullets-long",
      severity: "warning",
      title: longBullets === 1 ? "One bullet point is very long" : `${longBullets} bullet points are very long`,
      detail: `Bullets over about ${LIMITS.bulletMax} characters are hard to scan and often hold several ideas.`,
      fix: "Split long bullets into shorter ones, one idea each.",
      where: "experience",
    });
  } else if (hasExperience) {
    add({ id: "bullets-long", severity: "ok", title: "Bullet points are a readable length" });
  }

  const styles = [...new Set(dateValues(data).map(dateStyle).filter((s): s is string => s !== null))];
  if (styles.length > 1) {
    add({
      id: "date-formats",
      severity: "warning",
      title: "Dates are written in different styles",
      detail: `Found: ${styles.join("; ")}. An ATS can read the same date correctly or wrongly depending on its style, so mixing them risks gaps in your timeline.`,
      fix: "Pick one style (for example Jan 2022) and use it everywhere.",
    });
  } else {
    add({ id: "date-formats", severity: "ok", title: "Dates use one consistent style" });
  }

  const pagesEstimated = !(file && file.meta.pages !== null);
  const pages = file && file.meta.pages !== null ? file.meta.pages : Math.max(1, Math.ceil(words / LIMITS.wordsPerPage));
  if (pages > LIMITS.maxPages) {
    add({
      id: "length",
      severity: "warning",
      title: pagesEstimated ? `Probably more than ${LIMITS.maxPages} pages` : `${pages} pages is long`,
      detail: `${pagesEstimated ? "Judging by about " + words + " words" : "The file has " + pages + " pages"}. Most recruiters read the first page or two, and long CVs are often cut off by an ATS.`,
      fix: "Keep it to one or two pages: cut older or less relevant detail.",
    });
  } else {
    add({ id: "length", severity: "ok", title: "The length is fine" });
  }

  if (email && !EMAIL.test(email)) {
    add({
      id: "email-format",
      severity: "warning",
      title: "The email address does not look right",
      detail: `"${email}" is missing an @ or a domain. A wrong email means employers cannot reach you.`,
      fix: "Check the spelling of your email address.",
      where: "basics",
    });
  }

  const badTitles: string[] = [];
  for (const s of visibleSections(data)) {
    const standard = STANDARD_TITLES[s.type];
    if (!standard || visibleItems(s).length === 0) continue;
    if (!standard.includes(s.title.trim().toLowerCase())) badTitles.push(`"${s.title}"`);
  }
  if (badTitles.length > 0) {
    add({
      id: "section-titles",
      severity: "warning",
      title: "Some section names are unusual",
      detail: `${listOf(badTitles)}. An ATS looks for familiar headings such as Experience, Education and Skills to sort your CV.`,
      fix: "Rename them to the usual headings.",
    });
  } else {
    add({ id: "section-titles", severity: "ok", title: "Section names are standard" });
  }

  const hasSkills = visibleSections(data, "skills").some((s) => visibleItems(s).length > 0);
  if (!hasSkills) {
    add({
      id: "skills-section",
      severity: "warning",
      title: "No skills section",
      detail: "Skills are the first thing an ATS matches against a job description.",
      fix: "Add a skills section with the tools and abilities you have.",
      where: "skills",
    });
  } else {
    add({ id: "skills-section", severity: "ok", title: "There is a skills section", where: "skills" });
  }

  const noText = file?.findings.some((f) => f.id === "no-text") ?? false;
  if (!noText) {
    if (words < LIMITS.minWords) {
      add({
        id: "too-short",
        severity: "warning",
        title: "The CV is very short",
        detail: `About ${words} words. An ATS has little to match against a job.`,
        fix: "Add detail to your experience and skills.",
      });
    } else {
      add({ id: "too-short", severity: "ok", title: "There is enough text to work with" });
    }
  }

  if (BANGLA.test(text)) {
    add({
      id: "bangla",
      severity: "warning",
      title: "Some text is in Bangla script",
      detail: "Many ATS handle Bangla script poorly, and most employers' systems expect an English CV.",
      fix: "Write the CV in English (names can stay in English letters).",
    });
  }

  // Notes: worth knowing, not penalised.
  if (data.basics.photo) {
    add({
      id: "photo",
      severity: "note",
      title: "The CV has a photo",
      detail: "An ATS ignores photos. Some employers also prefer none, so check the job's instructions.",
    });
  }
  if (input.design?.contactIcons) {
    add({
      id: "icons",
      severity: "note",
      title: "Contact icons are switched on",
      detail: "Icons are pictures to an ATS; the text beside them is still read, so this is usually fine.",
    });
  }
  if (input.templateId && getTemplate(input.templateId).layout === "sidebar") {
    add({
      id: "multi-column",
      severity: "note",
      title: "This template has a sidebar",
      detail: "Some older ATS read a two-column page in the wrong order. A single-column template is the safest.",
    });
  }

  // What the server found about an uploaded file's layout.
  for (const f of file?.findings ?? []) {
    add({ id: `file-${f.id}`, severity: f.severity, title: f.title, detail: f.detail });
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, note: 2, ok: 3 };
  const sorted = findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => order[a.f.severity] - order[b.f.severity] || a.i - b.i)
    .map((x) => x.f);

  const counts: Record<Severity, number> = { critical: 0, warning: 0, note: 0, ok: 0 };
  for (const f of sorted) counts[f.severity]++;
  return { band: bandFor(counts.critical, counts.warning), findings: sorted, counts, words, pages, pagesEstimated };
}

/**
 * Strong: no criticals and at most 2 warnings. Good: no criticals and at most 5. Fair: one critical, or more
 * than 5 warnings. Needs work: anything worse (two or more criticals, or a critical and more than 5 warnings).
 */
export function bandFor(critical: number, warnings: number): Band {
  if (critical >= 2) return "needs-work";
  if (critical === 1) return warnings > 5 ? "needs-work" : "fair";
  if (warnings <= 2) return "strong";
  if (warnings <= 5) return "good";
  return "fair";
}

export const BAND_LABEL: Record<Band, string> = {
  strong: "Strong",
  good: "Good",
  fair: "Fair",
  "needs-work": "Needs work",
};
