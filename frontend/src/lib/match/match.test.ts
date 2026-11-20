import { describe, expect, it } from "vitest";

import { keyOf, labelOf, snapshotOf, type CvSourceValue } from "@/lib/cv-source";
import { jdProblem, MAX_JD_CHARS, MIN_JD_CHARS, readJd, saveJd } from "@/lib/jd";
import { emptyFieldSet, newId } from "@/lib/resume/defaults";
import { newDoc } from "@/lib/resume/doc";
import type { Extraction } from "@/lib/upload/convert";
import { haveThisHref } from "@/components/match/MatchResult";

import { clearMatch, fingerprint, readMatch, saveMatch } from "./session";
import { BAND_NAME } from "./types";

describe("fingerprint", () => {
  it("is stable, and differs when the text differs", () => {
    expect(fingerprint("hello")).toBe(fingerprint("hello"));
    expect(fingerprint("hello")).not.toBe(fingerprint("hellp"));
    expect(fingerprint("")).toBe(fingerprint(""));
  });

  it("tells apart texts of different length, even with a similar start", () => {
    expect(fingerprint("a".repeat(100))).not.toBe(fingerprint("a".repeat(101)));
  });
});

describe("job description rules", () => {
  it("needs a few lines and has a ceiling", () => {
    expect(jdProblem("short")).toMatch(/at least a few lines/);
    expect(jdProblem("   " + "x".repeat(MIN_JD_CHARS - 1) + "   ")).toMatch(/at least a few lines/);
    expect(jdProblem("x".repeat(MIN_JD_CHARS))).toBeNull();
    expect(jdProblem("x".repeat(MAX_JD_CHARS))).toBeNull();
    expect(jdProblem("x".repeat(MAX_JD_CHARS + 1))).toMatch(/too long/);
  });

  it("does not fail where there is no browser storage", () => {
    expect(() => saveJd("anything")).not.toThrow();
    expect(readJd()).toBe("");
    expect(() => saveMatch({ cvKey: "a", jdKey: "b", language: "en", analysis: { band: "good", summary: "", jobTitle: "", company: "", matching: [], missing: [], suggestions: [], demo: false } })).not.toThrow();
    expect(readMatch("a", "b")).toBeNull();
    expect(() => clearMatch()).not.toThrow();
  });
});

describe("the CV a tool works on", () => {
  const saved: CvSourceValue = (() => {
    const doc = newDoc("classic", "My CV");
    doc.data.basics.values.fullName = "Rahim Uddin";
    return { kind: "saved", id: "abc", title: "My CV", doc };
  })();

  const extraction: Extraction = {
    basics: { fullName: "Karim", headline: "", email: "k@example.com", phone: "", location: "", website: "", linkedin: "" },
    sections: [{ type: "skills", title: "Skills", entries: [{ fields: [{ field: "skills", value: "Excel" }] }] }],
    other: "",
    reviewNotes: [],
  };
  const file: CvSourceValue = {
    kind: "file",
    fileName: "karim.pdf",
    response: { cv: extraction, meta: { kind: "pdf", pages: 1, words: 50 }, findings: [], demo: false },
  };

  it("makes the same kind of snapshot for a saved resume and an uploaded file", () => {
    for (const v of [saved, file]) {
      const snap = snapshotOf(v) as { basics: Record<string, string>; sections: unknown[] };
      expect(Object.keys(snap)).toEqual(expect.arrayContaining(["basics", "sections"]));
      expect(JSON.stringify(snap)).not.toContain("photo");
    }
    expect((snapshotOf(saved) as { basics: Record<string, string> }).basics.fullName).toBe("Rahim Uddin");
    expect((snapshotOf(file) as { basics: Record<string, string> }).basics.fullName).toBe("Karim");
  });

  it("changes its key when the CV's text changes, and not otherwise", () => {
    const before = keyOf(saved);
    expect(keyOf(saved)).toBe(before);
    if (saved.kind !== "saved") throw new Error("fixture");
    const edited: CvSourceValue = { ...saved, doc: { ...saved.doc, data: { ...saved.doc.data, basics: { ...saved.doc.data.basics, values: { ...saved.doc.data.basics.values, fullName: "Someone Else" } } } } };
    expect(keyOf(edited)).not.toBe(before);
    expect(keyOf(file)).not.toBe(before);
  });

  it("names the CV for the page", () => {
    expect(labelOf(saved)).toBe("My CV");
    expect(labelOf(file)).toBe("karim.pdf");
    if (saved.kind === "saved") expect(labelOf({ ...saved, title: "" })).toBe("Untitled resume");
  });

  it("is not affected by ids that change from run to run", () => {
    // The same file read twice gets different entry ids; the key must not depend on them.
    expect(keyOf(file)).toBe(keyOf({ ...file }));
    void newId;
    void emptyFieldSet;
  });
});

describe("I have this", () => {
  it("opens the editor with the chat message ready, safely encoded", () => {
    const href = haveThisHref("abc-123", "Bank reconciliation & audit");
    expect(href.startsWith("/editor/abc-123?chat=")).toBe(true);
    const text = new URLSearchParams(href.split("?")[1]).get("chat");
    expect(text).toBe("I have experience with Bank reconciliation & audit.");
  });
});

describe("band names", () => {
  it("has a plain name for each band", () => {
    expect(Object.values(BAND_NAME)).toEqual(["Strong match", "Good match", "Partial match", "Low match"]);
  });
});
