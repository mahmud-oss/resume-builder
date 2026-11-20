import { describe, expect, it } from "vitest";

import { SECTION_SCHEMAS } from "@/lib/resume/schemas";

import { extractionToData, extractionToDoc, OTHER_TITLE, titleFor, type Extraction } from "./convert";
import { fileProblem } from "./file";
import { clearImportReview, readImportReview, saveImportReview } from "./review";

const basics = { fullName: "Rahim Uddin", headline: "", email: "rahim@example.com", phone: "", location: "Dhaka", website: "", linkedin: "" };

function cv(over: Partial<Extraction> = {}): Extraction {
  return { basics, sections: [], other: "", reviewNotes: [], ...over };
}

const entry = (...kv: string[]) => ({ fields: kv.reduce<{ field: string; value: string }[]>((acc, _, i) => (i % 2 ? acc : [...acc, { field: kv[i], value: kv[i + 1] }]), []) });

describe("extractionToData", () => {
  it("fills the contact details and leaves empty ones out", () => {
    const { data } = extractionToData(cv());
    expect(data.basics.values).toEqual({ fullName: "Rahim Uddin", email: "rahim@example.com", location: "Dhaka" });
    expect(data.basics.photo).toBeNull();
  });

  it("builds sections with their entries in order", () => {
    const { data, empty } = extractionToData(
      cv({
        sections: [
          { type: "experience", title: "Work history", entries: [entry("role", "Accountant", "company", "ABC Ltd", "description", "Kept ledgers\nPaid bills"), entry("role", "Clerk")] },
          { type: "skills", title: "", entries: [entry("category", "Tools", "skills", "Excel, Tally")] },
        ],
      }),
    );
    expect(empty).toBe(false);
    expect(data.sections.map((s) => [s.type, s.title])).toEqual([["experience", "Work history"], ["skills", "Skills"]]);
    expect(data.sections[0].items.map((i) => i.values.role)).toEqual(["Accountant", "Clerk"]);
    expect(data.sections[0].items[0].values.description).toBe("Kept ledgers\nPaid bills");
    expect(new Set(data.sections.flatMap((s) => s.items.map((i) => i.id))).size).toBe(3);
  });

  it("merges two sections of the same type, but keeps custom sections apart", () => {
    const { data } = extractionToData(
      cv({
        sections: [
          { type: "experience", title: "Experience", entries: [entry("role", "A")] },
          { type: "experience", title: "Internships", entries: [entry("role", "B")] },
          { type: "custom", title: "Awards", entries: [entry("heading", "Best staff")] },
          { type: "custom", title: "Training", entries: [entry("heading", "Excel course")] },
        ],
      }),
    );
    expect(data.sections.map((s) => s.type)).toEqual(["experience", "custom", "custom"]);
    expect(data.sections[0].items.map((i) => i.values.role)).toEqual(["A", "B"]);
    expect(data.sections.slice(1).map((s) => s.title)).toEqual(["Awards", "Training"]);
  });

  it("keeps text that fits no field in an Other section instead of dropping it", () => {
    const { data } = extractionToData(
      cv({
        sections: [
          { type: "education", title: "Education", entries: [entry("degree", "BBA", "grade", "First class")] },
          { type: "hobbies", title: "Hobbies", entries: [entry("text", "Cricket")] },
        ],
        other: "Nationality: Bangladeshi\nDate of birth: 1 Jan 2000",
      }),
    );
    const other = data.sections.at(-1)!;
    expect(other.type).toBe("custom");
    expect(other.title).toBe(OTHER_TITLE);
    expect(other.items[0].values.details.split("\n")).toEqual([
      "Nationality: Bangladeshi",
      "Date of birth: 1 Jan 2000",
      "grade: First class",
      "text: Cricket",
    ]);
    expect(data.sections[0].items[0].values).toEqual({ degree: "BBA" });
  });

  it("joins a summary's extra entries into one paragraph", () => {
    const { data } = extractionToData(cv({ sections: [{ type: "summary", title: "Profile", entries: [entry("text", "One."), entry("text", "Two.")] }] }));
    expect(data.sections[0].items).toHaveLength(1);
    expect(data.sections[0].items[0].values.text).toBe("One.\n\nTwo.");
  });

  it("only produces fields the editor knows", () => {
    const { data } = extractionToData(
      cv({ sections: [{ type: "projects", title: "Projects", entries: [entry("name", "Site", "unknown", "x", "link", "https://x.dev")] }] }),
    );
    const known = new Set(SECTION_SCHEMAS.projects.fields.map((f) => f.key));
    for (const key of Object.keys(data.sections[0].items[0].values)) expect(known.has(key)).toBe(true);
  });

  it("drops empty entries and sections, and reports an empty file", () => {
    const { data, empty } = extractionToData({
      basics: { ...basics, fullName: "", email: "", location: "" },
      sections: [{ type: "experience", title: "Experience", entries: [entry("role", "  ")] }],
      other: "",
      reviewNotes: [],
    });
    expect(data.sections).toEqual([]);
    expect(empty).toBe(true);
  });

  it("survives a badly shaped answer", () => {
    const messy = { basics: null, sections: [{ type: "skills", entries: null }, { type: "experience", title: "E", entries: [{ fields: null }] }], other: null, reviewNotes: null } as unknown as Extraction;
    expect(() => extractionToData(messy)).not.toThrow();
    expect(extractionToData(messy).empty).toBe(true);
  });

  it("passes the review notes on, trimmed", () => {
    expect(extractionToData(cv({ reviewNotes: ["  Check the year. ", "", "Check the name."] })).notes).toEqual(["Check the year.", "Check the name."]);
  });
});

describe("extractionToDoc and titleFor", () => {
  it("uses the chosen template's design with the file's content", () => {
    const { doc } = extractionToDoc(cv({ sections: [{ type: "skills", title: "Skills", entries: [entry("skills", "Excel")] }] }), "modern", "Rahim – CV");
    expect(doc.templateId).toBe("modern");
    expect(doc.title).toBe("Rahim – CV");
    expect(doc.data.sections).toHaveLength(1);
  });

  it("names the resume after the person, else the file", () => {
    expect(titleFor(cv(), "cv.pdf")).toBe("Rahim Uddin – CV");
    expect(titleFor(cv({ basics: { ...basics, fullName: "" } }), "My CV final.docx")).toBe("My CV final");
    expect(titleFor(cv({ basics: { ...basics, fullName: "" } }), ".pdf")).toBe("Uploaded CV");
  });
});

describe("fileProblem", () => {
  it("accepts PDF and DOCX within the size limit", () => {
    expect(fileProblem({ name: "cv.PDF", size: 1000 })).toBeNull();
    expect(fileProblem({ name: "cv.docx", size: 4 * 1024 * 1024 })).toBeNull();
  });

  it("rejects other types, empty and oversized files", () => {
    expect(fileProblem({ name: "cv.doc", size: 1000 })).toMatch(/PDF or Word/);
    expect(fileProblem({ name: "cv.png", size: 1000 })).toMatch(/PDF or Word/);
    expect(fileProblem({ name: "cv.pdf", size: 0 })).toMatch(/empty/);
    expect(fileProblem({ name: "cv.pdf", size: 4 * 1024 * 1024 + 1 })).toMatch(/4 MB/);
  });
});

describe("import review storage", () => {
  it("is empty when nothing was saved or when storage is unavailable", () => {
    expect(readImportReview("none")).toBeNull();
    expect(() => saveImportReview("x", { notes: [], demo: false })).not.toThrow();
    expect(() => clearImportReview("x")).not.toThrow();
  });
});
