import { describe, expect, it } from "vitest";

import { buildSnapshot } from "@/lib/ai/snapshot";
import { emptyFieldSet, newId } from "@/lib/resume/defaults";
import type { Item, ResumeDoc, Section, SectionType } from "@/lib/resume/types";
import { newDoc } from "@/lib/resume/doc";

import { applyAccepted, countByStatus, describeEntry, kindOf, versionTitle } from "./apply";
import { groupVersions } from "./group";
import { REGENERATE_HINTS, type ChangeItem } from "./types";

function item(values: Record<string, string>): Item {
  return { id: newId(), ...emptyFieldSet(), values };
}
function section(type: SectionType, title: string, items: Item[], hidden = false): Section {
  return { id: newId(), type, title, items, ...(hidden ? { hidden } : {}) };
}

function doc(): ResumeDoc {
  const base = newDoc("classic", "Rahim CV");
  base.data.sections = [
    section("summary", "Summary", [item({ text: "Hard-working assistant." })]),
    section("experience", "Experience", [
      item({ role: "Accounts Assistant", company: "Sample Traders", description: "Prepared cash reports\nHelped with closing" }),
      item({ role: "Intern", company: "ABC", description: "Looked after books" }),
    ]),
    section("skills", "Skills", [item({ category: "Software", skills: "Excel, Tally, Word" })]),
  ];
  return base;
}

const change = (over: Partial<ChangeItem>): ChangeItem => ({
  id: "c1", entry: "summary.1", field: "text", before: "", after: "", reason: "", status: "accepted", text: "", edited: false, ...over,
});

describe("applyAccepted", () => {
  it("puts only the accepted changes into the copy", () => {
    const d = doc();
    const next = applyAccepted(d, [
      change({ id: "a", entry: "summary.1", field: "text", text: "Assistant who keeps accounts accurate.", status: "accepted" }),
      change({ id: "b", entry: "experience.2", field: "description", text: "Kept the books", status: "rejected" }),
      change({ id: "c", entry: "skills.1", field: "skills", text: "Tally, Excel, Word", status: "pending" }),
    ]);
    expect(next.data.sections[0].items[0].values.text).toBe("Assistant who keeps accounts accurate.");
    expect(next.data.sections[1].items[1].values.description).toBe("Looked after books"); // rejected: unchanged
    expect(next.data.sections[2].items[0].values.skills).toBe("Excel, Tally, Word"); // not decided: unchanged
  });

  it("never touches the original document", () => {
    const d = doc();
    const before = JSON.stringify(d);
    const next = applyAccepted(d, [change({ entry: "experience.1", field: "description", text: "Reworded" })]);
    expect(JSON.stringify(d)).toBe(before);
    expect(next).not.toBe(d);
    expect(next.data.sections[1].items[0].values.description).toBe("Reworded");
    expect(next.data.sections[1].items[0].values.role).toBe("Accounts Assistant"); // protected fields stay
  });

  it("uses the user's edited wording, and keeps everything else", () => {
    const next = applyAccepted(doc(), [change({ entry: "skills.1", field: "skills", text: "Tally, Excel, Word", edited: true })]);
    expect(next.data.sections[2].items[0].values).toEqual({ category: "Software", skills: "Tally, Excel, Word" });
    expect(next.title).toBe("Rahim CV");
    expect(next.templateId).toBe("classic");
  });

  it("skips a change whose entry is not there instead of guessing", () => {
    const d = doc();
    const next = applyAccepted(d, [change({ entry: "experience.9", field: "description", text: "x" }), change({ entry: "nonsense", field: "text", text: "x" })]);
    expect(JSON.stringify(next.data)).toBe(JSON.stringify(d.data));
  });

  it("reads the entry numbers the same way the snapshot counted them (hidden entries are not counted)", () => {
    const d = doc();
    d.data.sections[1].items[0].hidden = true; // the first job is hidden: "experience.1" is now the intern entry
    const next = applyAccepted(d, [change({ entry: "experience.1", field: "description", text: "Reworded intern" })]);
    expect(next.data.sections[1].items[1].values.description).toBe("Reworded intern");
    expect(next.data.sections[1].items[0].values.description).toBe("Prepared cash reports\nHelped with closing");
  });

  it("does nothing when nothing is accepted", () => {
    const d = doc();
    expect(applyAccepted(d, [])).toBe(d);
    expect(applyAccepted(d, [change({ status: "rejected" })])).toBe(d);
  });
});

describe("describing a change", () => {
  const snap = buildSnapshot(doc());

  it("names jobs, skills and the summary in words", () => {
    expect(describeEntry(snap, "experience.1")).toEqual({ section: "Experience", label: "Accounts Assistant at Sample Traders" });
    expect(describeEntry(snap, "skills.1")).toEqual({ section: "Skills", label: "Software" });
    expect(describeEntry(snap, "summary.1")).toEqual({ section: "Summary", label: "Summary" });
    expect(describeEntry(snap, "projects.4")).toEqual({ section: "Resume", label: "projects.4" });
  });

  it("says what kind of change it is", () => {
    expect(kindOf("text")).toBe("Summary");
    expect(kindOf("description")).toBe("Bullet points");
    expect(kindOf("skills")).toBe("Order of skills");
  });
});

describe("naming a version", () => {
  it("uses the original's title and the job title, else the company, else a plain label", () => {
    expect(versionTitle("Rahim CV", "Accounts Assistant", "ABC")).toBe("Rahim CV · Accounts Assistant");
    expect(versionTitle("Rahim CV", "", "ABC")).toBe("Rahim CV · ABC");
    expect(versionTitle("Rahim CV", "", "")).toBe("Rahim CV · Tailored");
    expect(versionTitle("  ", "Clerk", "")).toBe("Resume · Clerk");
  });

  it("stays within the title limit", () => {
    expect(versionTitle("x".repeat(300), "Clerk", "").length).toBe(200);
  });
});

describe("counting decisions", () => {
  it("counts each kind", () => {
    expect(countByStatus([{ status: "accepted" }, { status: "accepted" }, { status: "rejected" }, { status: "pending" }])).toEqual({ accepted: 2, rejected: 1, pending: 1 });
    expect(countByStatus([])).toEqual({ accepted: 0, rejected: 0, pending: 0 });
  });
});

describe("grouping versions under their original", () => {
  const r = (id: string, tailoredFrom: string | null = null) => ({ id, tailoredFrom });

  it("lists originals in order with their versions under them", () => {
    const groups = groupVersions([r("v1", "a"), r("a"), r("b"), r("v2", "a"), r("v3", "b")]);
    expect(groups.map((g) => g.original.id)).toEqual(["a", "b"]);
    expect(groups[0].versions.map((v) => v.id)).toEqual(["v1", "v2"]);
    expect(groups[1].versions.map((v) => v.id)).toEqual(["v3"]);
  });

  it("lists a version on its own when its original is not in the list", () => {
    const groups = groupVersions([r("a"), r("orphan", "deleted")]);
    expect(groups.map((g) => g.original.id)).toEqual(["a", "orphan"]);
    expect(groups.every((g) => g.versions.length === 0)).toBe(true);
  });

  it("copes with an empty list and keeps every resume exactly once", () => {
    expect(groupVersions([])).toEqual([]);
    const all = [r("a"), r("v", "a"), r("b")];
    const shown = groupVersions(all).flatMap((g) => [g.original.id, ...g.versions.map((v) => v.id)]);
    expect(shown.sort()).toEqual(["a", "b", "v"]);
  });
});

describe("regenerate hints", () => {
  it("offers a few short steers", () => {
    expect(REGENERATE_HINTS.length).toBeGreaterThanOrEqual(3);
    for (const h of REGENERATE_HINTS) expect(h.length).toBeLessThan(40);
  });
});
