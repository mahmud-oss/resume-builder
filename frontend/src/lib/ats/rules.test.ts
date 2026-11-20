import { describe, expect, it } from "vitest";

import { emptyFieldSet, newId } from "@/lib/resume/defaults";
import type { Item, ResumeData, Section, SectionType } from "@/lib/resume/types";
import { DEFAULT_DESIGN } from "@/lib/resume/design";

import { bandFor, BAND_LABEL, checkResume, countWords, dateStyle } from "./rules";
import type { AtsInput, FileReport } from "./types";

// --- fixtures ---------------------------------------------------------------------------------------

function item(values: Record<string, string>): Item {
  return { id: newId(), ...emptyFieldSet(), values };
}

function section(type: SectionType, title: string, items: Item[], hidden = false): Section {
  return { id: newId(), type, title, items, ...(hidden ? { hidden } : {}) };
}

const BULLETS = "Prepared daily cash reports for the branch\nHelped with month-end closing and reconciliations";
const LONG_TEXT = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
/** Many short bullets, so the CV has enough text without any single bullet being long. */
const FILLER = Array.from({ length: 10 }, (_, i) => `Handled routine accounting task number ${i} for the branch`).join("\n");

/** A CV with nothing wrong with it. */
function good(over: Partial<ResumeData> = {}): ResumeData {
  return {
    basics: { ...emptyFieldSet(), photo: null, values: { fullName: "Rahim Uddin", email: "rahim@example.com", phone: "01711000000" } },
    sections: [
      section("summary", "Summary", [item({ text: "Accounts assistant with two years in a trading company. " + LONG_TEXT })]),
      section("experience", "Experience", [
        item({ role: "Accounts Assistant", company: "Sample Traders", startDate: "Jan 2022", endDate: "Present", description: BULLETS + "\n" + FILLER }),
      ]),
      section("education", "Education", [item({ degree: "BBA", institution: "Dhaka University", startDate: "2017", endDate: "2021" })]),
      section("skills", "Skills", [item({ category: "Software", skills: "Excel, Tally" })]),
    ],
    ...over,
  };
}

function run(data: ResumeData, extra: Partial<AtsInput> = {}) {
  return checkResume({ data, ...extra });
}

function ids(r: ReturnType<typeof run>, severity?: string) {
  return r.findings.filter((f) => !severity || f.severity === severity).map((f) => f.id);
}

function without(data: ResumeData, type: SectionType): ResumeData {
  return { ...data, sections: data.sections.filter((s) => s.type !== type) };
}

function edited(data: ResumeData, type: SectionType, change: (s: Section) => Section): ResumeData {
  return { ...data, sections: data.sections.map((s) => (s.type === type ? change(s) : s)) };
}

// --- the rules ---------------------------------------------------------------------------------------

describe("a CV with nothing wrong", () => {
  it("has no criticals or warnings and is Strong", () => {
    const r = run(good());
    expect(r.counts.critical).toBe(0);
    expect(r.counts.warning).toBe(0);
    expect(r.band).toBe("strong");
    expect(ids(r, "ok")).toEqual(expect.arrayContaining(["contact", "summary", "bullets-missing", "section-titles", "skills-section"]));
  });
});

describe("critical rules", () => {
  it("reports each missing contact detail on its own", () => {
    const data = good();
    data.basics.values = { fullName: "", email: "", phone: "" };
    const r = run(data);
    expect(ids(r, "critical")).toEqual(expect.arrayContaining(["name", "email", "phone"]));
    expect(ids(r, "ok")).not.toContain("contact");
  });

  it("does not count a hidden field as present", () => {
    const data = good();
    data.basics.hiddenFields = { email: true };
    expect(ids(run(data), "critical")).toEqual(["email"]);
  });

  it("needs experience or education", () => {
    const none = { ...good(), sections: good().sections.filter((s) => !["experience", "education"].includes(s.type)) };
    expect(ids(run(none), "critical")).toContain("experience-or-education");
    expect(ids(run(without(good(), "experience")), "critical")).not.toContain("experience-or-education");
    expect(ids(run(without(good(), "education")), "critical")).not.toContain("experience-or-education");
  });

  it("ignores hidden sections and empty entries", () => {
    const hidden = edited(edited(good(), "experience", (s) => ({ ...s, hidden: true })), "education", (s) => ({ ...s, items: [item({})] }));
    expect(ids(run(hidden), "critical")).toContain("experience-or-education");
  });
});

describe("warnings", () => {
  it("summary: missing or too long", () => {
    expect(ids(run(without(good(), "summary")), "warning")).toContain("summary");
    const long = edited(good(), "summary", (s) => ({ ...s, items: [item({ text: "x".repeat(601) })] }));
    const r = run(long);
    expect(r.findings.find((f) => f.id === "summary")?.title).toMatch(/long/);
    expect(ids(run(edited(good(), "summary", (s) => ({ ...s, items: [item({ text: "x".repeat(600) })] }))), "warning")).not.toContain("summary");
  });

  it("jobs without bullets are named", () => {
    const data = edited(good(), "experience", (s) => ({
      ...s,
      items: [...s.items, item({ role: "Clerk", company: "ABC", description: "" })],
    }));
    const f = run(data).findings.find((x) => x.id === "bullets-missing")!;
    expect(f.severity).toBe("warning");
    expect(f.detail).toContain("Clerk");
  });

  it("long bullets are counted, in any bullet field", () => {
    const long = "y".repeat(221);
    const data = edited(good(), "education", (s) => ({ ...s, items: [item({ degree: "BBA", details: long })] }));
    const r = run(edited(data, "experience", (s) => ({ ...s, items: [item({ role: "A", description: long + "\nshort" })] })));
    expect(r.findings.find((f) => f.id === "bullets-long")?.title).toMatch(/2 bullet points/);
    expect(ids(run(edited(good(), "experience", (s) => ({ ...s, items: [item({ role: "A", description: "y".repeat(220) })] }))), "warning")).not.toContain("bullets-long");
  });

  it("mixed date styles", () => {
    const mixed = edited(good(), "experience", (s) => ({
      ...s,
      items: [item({ role: "A", description: BULLETS, startDate: "Jan 2020", endDate: "03/2022" })],
    }));
    expect(ids(run(mixed), "warning")).toContain("date-formats");
    const consistent = edited(good(), "experience", (s) => ({
      ...s,
      items: [item({ role: "A", description: BULLETS, startDate: "Jan 2020", endDate: "Present" }), item({ role: "B", description: BULLETS, startDate: "Mar 2018", endDate: "Dec 2019" })],
    }));
    expect(ids(run(consistent), "warning")).not.toContain("date-formats");
  });

  it("bare years and Present never clash with other styles", () => {
    expect(dateStyle("2021")).toBeNull();
    expect(dateStyle("Present")).toBeNull();
    expect(dateStyle("till date")).toBeNull();
    expect(dateStyle("")).toBeNull();
    expect(dateStyle("Jan 2021")).toBe(dateStyle("Mar 2019"));
    expect(dateStyle("January 2021")).not.toBe(dateStyle("Jan 2021"));
    expect(dateStyle("01/2021")).not.toBe(dateStyle("2021-01"));
    expect(dateStyle("15/01/2021")).toMatch(/Full date/);
    expect(dateStyle("sometime")).toBe("other");
  });

  it("length: estimated from words for a saved resume, read from the file otherwise", () => {
    const wordy = edited(good(), "experience", (s) => ({
      ...s,
      items: [item({ role: "A", description: Array.from({ length: 1200 }, (_, i) => `w${i}`).join(" ") })],
    }));
    const saved = run(wordy);
    expect(saved.pagesEstimated).toBe(true);
    expect(ids(saved, "warning")).toContain("length");
    expect(run(good()).pagesEstimated).toBe(true);
    expect(ids(run(good()), "warning")).not.toContain("length");

    const file: FileReport = { meta: { kind: "pdf", pages: 3, words: 600 }, findings: [] };
    const fromFile = run(good(), { file });
    expect(fromFile.pagesEstimated).toBe(false);
    expect(fromFile.pages).toBe(3);
    expect(fromFile.findings.find((f) => f.id === "length")?.title).toBe("3 pages is long");
    expect(ids(run(good(), { file: { meta: { kind: "pdf", pages: 2, words: 600 }, findings: [] } }), "warning")).not.toContain("length");
  });

  it("an email that does not look right", () => {
    const data = good();
    data.basics.values.email = "rahim.example.com";
    expect(ids(run(data), "warning")).toContain("email-format");
    expect(ids(run(good()), "warning")).not.toContain("email-format");
  });

  it("unusual section names, but not for custom titles on standard ones", () => {
    const odd = edited(good(), "experience", (s) => ({ ...s, title: "My journey" }));
    expect(run(odd).findings.find((f) => f.id === "section-titles")?.detail).toContain('"My journey"');
    const fine = edited(good(), "experience", (s) => ({ ...s, title: "Work Experience" }));
    expect(ids(run(fine), "warning")).not.toContain("section-titles");
    const projectsAnyName = { ...good(), sections: [...good().sections, section("projects", "Things I built", [item({ name: "Site" })])] };
    expect(ids(run(projectsAnyName), "warning")).not.toContain("section-titles");
  });

  it("no skills section", () => {
    expect(ids(run(without(good(), "skills")), "warning")).toContain("skills-section");
    expect(ids(run(edited(good(), "skills", (s) => ({ ...s, items: [item({})] }))), "warning")).toContain("skills-section");
  });

  it("a very short CV", () => {
    const short = {
      basics: good().basics,
      sections: [section("experience", "Experience", [item({ role: "Clerk", description: "Did work" })]), section("skills", "Skills", [item({ skills: "Excel" })])],
    };
    expect(ids(run(short), "warning")).toContain("too-short");
    expect(ids(run(good()), "warning")).not.toContain("too-short");
  });

  it("Bangla script", () => {
    const bangla = edited(good(), "summary", (s) => ({ ...s, items: [item({ text: "রহিম " + LONG_TEXT })] }));
    expect(ids(run(bangla), "warning")).toContain("bangla");
    expect(ids(run(good()), "warning")).not.toContain("bangla");
  });
});

describe("notes", () => {
  it("photo, contact icons and a sidebar template are notes, not penalties", () => {
    const data = good();
    data.basics.photo = "data:image/jpeg;base64,xx";
    const r = run(data, { templateId: "modern", design: { ...DEFAULT_DESIGN, contactIcons: true } });
    expect(ids(r, "note")).toEqual(expect.arrayContaining(["photo", "icons", "multi-column"]));
    expect(r.band).toBe("strong");
    expect(ids(run(good(), { templateId: "classic", design: DEFAULT_DESIGN }), "note")).toEqual([]);
  });
});

describe("what the server found about an uploaded file", () => {
  const file: FileReport = {
    meta: { kind: "docx", pages: 1, words: 700 },
    findings: [
      { id: "tables", severity: "warning", title: "The document uses tables", detail: "d" },
      { id: "images", severity: "note", title: "The document contains pictures", detail: "d" },
    ],
  };

  it("merges the file's findings with the content findings", () => {
    const r = run(good(), { file });
    expect(ids(r)).toEqual(expect.arrayContaining(["file-tables", "file-images"]));
    expect(r.findings.find((f) => f.id === "file-tables")?.severity).toBe("warning");
    expect(r.counts.warning).toBe(1);
  });

  it("a scan is critical, and the word-count rule steps aside", () => {
    const scan: FileReport = { meta: { kind: "pdf", pages: 1, words: 0 }, findings: [{ id: "no-text", severity: "critical", title: "No readable text", detail: "d" }] };
    const r = run(good(), { file: scan });
    expect(ids(r, "critical")).toContain("file-no-text");
    expect(ids(r)).not.toContain("too-short");
  });

  it("uses the file's own word count", () => {
    expect(run(good(), { file }).words).toBe(700);
  });
});

describe("ordering and counts", () => {
  it("lists criticals first, then warnings, notes and what is fine", () => {
    const data = good();
    data.basics.values.email = "";
    data.basics.photo = "data:image/jpeg;base64,xx";
    const r = run(without(data, "skills"));
    const order = r.findings.map((f) => f.severity);
    expect(order).toEqual([...order].sort((a, b) => ["critical", "warning", "note", "ok"].indexOf(a) - ["critical", "warning", "note", "ok"].indexOf(b)));
    expect(r.counts.critical + r.counts.warning + r.counts.note + r.counts.ok).toBe(r.findings.length);
    expect(r.findings[0].severity).toBe("critical");
  });

  it("gives every finding an id and a title, and a fix to every problem", () => {
    const data = good();
    data.basics.values = { fullName: "", email: "bad", phone: "" };
    const r = run(without(without(data, "skills"), "summary"));
    for (const f of r.findings) {
      expect(f.id).toBeTruthy();
      expect(f.title).toBeTruthy();
      if (f.severity === "critical" || f.severity === "warning") expect(f.fix).toBeTruthy();
    }
  });
});

describe("bands", () => {
  it("follows the rules in the PRD", () => {
    expect(bandFor(0, 0)).toBe("strong");
    expect(bandFor(0, 2)).toBe("strong");
    expect(bandFor(0, 3)).toBe("good");
    expect(bandFor(0, 5)).toBe("good");
    expect(bandFor(0, 6)).toBe("fair");
    expect(bandFor(1, 0)).toBe("fair");
    expect(bandFor(1, 5)).toBe("fair");
    expect(bandFor(1, 6)).toBe("needs-work");
    expect(bandFor(2, 0)).toBe("needs-work");
    expect(bandFor(5, 9)).toBe("needs-work");
  });

  it("has a label for each band", () => {
    expect(Object.values(BAND_LABEL)).toEqual(["Strong", "Good", "Fair", "Needs work"]);
  });
});

describe("countWords", () => {
  it("counts words and handles blanks", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("one two\nthree")).toBe(3);
  });
});
