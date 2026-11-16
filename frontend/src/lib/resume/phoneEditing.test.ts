import { describe, expect, it } from "vitest";

import { newDoc } from "./doc";
import { describeRef, fieldKeyOf, orderForForm, parseFocusKey } from "./fieldAccess";
import { addCustomField, addSection, applyEdit } from "./mutations";
import { getTemplate, sectionNeighbours } from "./templates";

describe("what a tapped piece of text is", () => {
  it("reads a focus key back into its reference, with or without a bullet line", () => {
    const ref = { kind: "basics", field: "fullName" } as const;
    expect(parseFocusKey(JSON.stringify(ref))).toEqual(ref);
    expect(parseFocusKey(JSON.stringify(ref) + "#3")).toEqual(ref);
    expect(fieldKeyOf(JSON.stringify(ref) + "#12")).toBe(JSON.stringify(ref));
    expect(parseFocusKey("nonsense")).toBeNull();
    expect(parseFocusKey("[1,2]")).toBeNull();
  });

  it("names the field, its kind and its value", () => {
    let doc = newDoc();
    doc = applyEdit({ kind: "basics", field: "fullName" }, "Rahim")(doc);
    expect(describeRef(doc, { kind: "basics", field: "fullName" })).toMatchObject({ label: "Full name", kind: "text", value: "Rahim" });
    expect(describeRef(doc, { kind: "basics", field: "phone" })).toMatchObject({ label: "Phone", value: "" });
    const exp = doc.data.sections.find((s) => s.type === "experience")!;
    const item = exp.items[0];
    expect(describeRef(doc, { kind: "item", sectionId: exp.id, itemId: item.id, field: "role" })).toMatchObject({ label: "Job title", kind: "text" });
    expect(describeRef(doc, { kind: "item", sectionId: exp.id, itemId: item.id, field: "description" })).toMatchObject({ kind: "bullets", hint: "One point per line" });
    expect(describeRef(doc, { kind: "sectionTitle", sectionId: exp.id })).toMatchObject({ label: "Section title", value: "Experience" });
  });

  it("finds the user's own details, and returns null for something that is gone", () => {
    let doc = addCustomField({ kind: "basics" }, "c1")(newDoc());
    doc = applyEdit({ kind: "basicsCustom", id: "c1" }, "Nationality: Bangladeshi")(doc);
    expect(describeRef(doc, { kind: "basicsCustom", id: "c1" })).toMatchObject({ label: "Your detail", value: "Nationality: Bangladeshi" });
    expect(describeRef(doc, { kind: "basicsCustom", id: "gone" })).toBeNull();
    expect(describeRef(doc, { kind: "item", sectionId: "x", itemId: "y", field: "role" })).toBeNull();
    expect(describeRef(doc, { kind: "sectionTitle", sectionId: "x" })).toBeNull();
  });
});

describe("neighbouring sections", () => {
  it("in a one-column template they are the ones next to it", () => {
    const doc = newDoc();
    const ids = doc.data.sections.map((s) => s.id);
    const classic = getTemplate("classic");
    expect(sectionNeighbours(classic, doc.data.sections, ids[0])).toEqual({ prevId: undefined, nextId: ids[1] });
    expect(sectionNeighbours(classic, doc.data.sections, ids[2])).toEqual({ prevId: ids[1], nextId: ids[3] });
    expect(sectionNeighbours(classic, doc.data.sections, ids.at(-1)!).nextId).toBeUndefined();
    expect(sectionNeighbours(classic, doc.data.sections, "missing")).toEqual({});
  });

  it("on a sidebar template they stay inside their own column", () => {
    const modern = getTemplate("modern");
    let doc = newDoc();
    doc = addSection("certifications", "cert")(doc);
    const sections = doc.data.sections;
    const skills = sections.find((s) => s.type === "skills")!;
    const languages = sections.find((s) => s.type === "languages")!;
    expect(sectionNeighbours(modern, sections, skills.id).nextId).toBe(languages.id);
    expect(sectionNeighbours(modern, sections, "cert").prevId).toBe(languages.id);
    const projects = sections.find((s) => s.type === "projects")!;
    const next = sectionNeighbours(modern, sections, projects.id).nextId;
    expect(next === undefined || ![skills.id, languages.id, "cert"].includes(next)).toBe(true);
  });
});

describe("stepping through fields", () => {
  const key = (r: object) => JSON.stringify(r);

  it("follows the form order inside one entry, not where the dates sit on the page", () => {
    const doc = newDoc();
    const exp = doc.data.sections.find((s) => s.type === "experience")!;
    const item = exp.items[0];
    const f = (field: string) => key({ kind: "item", sectionId: exp.id, itemId: item.id, field });
    // the page shows: title, then the dates on its row, then company and location, then the points
    const onPage = [f("role"), f("startDate"), f("endDate"), f("company"), f("location"), f("description")];
    expect(orderForForm(onPage, doc)).toEqual([f("role"), f("company"), f("location"), f("startDate"), f("endDate"), f("description")]);
  });

  it("keeps the page's order between entries and for everything else", () => {
    let doc = newDoc();
    doc = addSection("experience", "second")(doc);
    const exp = doc.data.sections.find((s) => s.type === "experience")!;
    const name = key({ kind: "basics", field: "fullName" });
    const title = key({ kind: "sectionTitle", sectionId: exp.id });
    const a = key({ kind: "item", sectionId: exp.id, itemId: exp.items[0].id, field: "role" });
    const b = key({ kind: "item", sectionId: "second", itemId: doc.data.sections.find((s) => s.id === "second")!.items[0].id, field: "role" });
    expect(orderForForm([name, title, a, b], doc)).toEqual([name, title, a, b]);
  });

  it("puts a detail of the user's own after the entry's regular fields", () => {
    let doc = newDoc();
    const exp = doc.data.sections.find((s) => s.type === "experience")!;
    doc = addCustomField({ kind: "basics" }, "x")(doc);
    const item = exp.items[0];
    const custom = key({ kind: "itemCustom", sectionId: exp.id, itemId: item.id, id: "c" });
    const role = key({ kind: "item", sectionId: exp.id, itemId: item.id, field: "role" });
    const end = key({ kind: "item", sectionId: exp.id, itemId: item.id, field: "endDate" });
    expect(orderForForm([custom, role, end], doc)).toEqual([role, end, custom]);
  });
});
