import { describe, expect, it } from "vitest";

import { DEFAULT_DESIGN, normaliseDesign } from "./design";
import { emptyData, isBlank, normaliseData } from "./defaults";
import { historyReducer, initHistory } from "./history";
import {
  addCustomField,
  addSection,
  applyEdit,
  moveSection,
  removeItem,
  setTemplate,
  toggleFieldHidden,
} from "./mutations";
import type { ResumeDoc } from "./types";

function newDoc(): ResumeDoc {
  return { title: "T", templateId: "classic", data: emptyData(), design: DEFAULT_DESIGN };
}

describe("editing", () => {
  it("edits a header field and leaves the original document untouched", () => {
    const doc = newDoc();
    const next = applyEdit({ kind: "basics", field: "fullName" }, "Tanvir")(doc);
    expect(next.data.basics.values.fullName).toBe("Tanvir");
    expect(doc.data.basics.values.fullName).toBeUndefined();
  });

  it("switching template keeps all content", () => {
    const edited = applyEdit({ kind: "basics", field: "fullName" }, "Tanvir")(newDoc());
    const switched = setTemplate("modern")(edited);
    expect(switched.templateId).toBe("modern");
    expect(switched.data).toBe(edited.data);
  });

  it("a hidden field stays hidden after switching template", () => {
    let doc = applyEdit({ kind: "basics", field: "phone" }, "123")(newDoc());
    doc = toggleFieldHidden({ kind: "basics" }, "phone")(doc);
    doc = setTemplate("executive")(doc);
    expect(doc.data.basics.hiddenFields.phone).toBe(true);
    expect(doc.data.basics.values.phone).toBe("123");
  });

  it("adds and edits a custom field", () => {
    let doc = addCustomField({ kind: "basics" })(newDoc());
    const id = doc.data.basics.custom[0].id;
    doc = applyEdit({ kind: "basicsCustom", id, part: "label" }, "Father's name")(doc);
    doc = applyEdit({ kind: "basicsCustom", id, part: "value" }, "Example")(doc);
    expect(doc.data.basics.custom[0]).toMatchObject({ label: "Father's name", value: "Example" });
  });

  it("adds a custom section and reorders sections", () => {
    let doc = addSection("custom")(newDoc());
    const last = doc.data.sections[doc.data.sections.length - 1];
    const first = doc.data.sections[0];
    expect(last.type).toBe("custom");
    doc = moveSection(last.id, first.id)(doc);
    expect(doc.data.sections[0].id).toBe(last.id);
  });

  it("removing the last item in a section leaves one empty item", () => {
    const doc = newDoc();
    const section = doc.data.sections[1];
    const next = removeItem(section.id, section.items[0].id)(doc);
    expect(next.data.sections[1].items).toHaveLength(1);
    expect(next.data.sections[1].items[0].id).not.toBe(section.items[0].id);
  });

  it("knows when a resume is blank", () => {
    const doc = newDoc();
    expect(isBlank(doc.data)).toBe(true);
    expect(isBlank(applyEdit({ kind: "basics", field: "fullName" }, "A")(doc).data)).toBe(false);
  });
});

describe("undo and redo", () => {
  const edit = (text: string) => applyEdit({ kind: "basics", field: "fullName" }, text);

  it("merges quick typing into one undo step", () => {
    let s = initHistory(newDoc());
    s = historyReducer(s, { type: "mutate", mutation: edit("T"), coalesceKey: "name", at: 0 });
    s = historyReducer(s, { type: "mutate", mutation: edit("Ta"), coalesceKey: "name", at: 200 });
    s = historyReducer(s, { type: "mutate", mutation: edit("Tan"), coalesceKey: "name", at: 400 });
    expect(s.past).toHaveLength(1);
    s = historyReducer(s, { type: "undo" });
    expect(s.present.data.basics.values.fullName).toBeUndefined();
  });

  it("starts a new step after a pause or a different field", () => {
    let s = initHistory(newDoc());
    s = historyReducer(s, { type: "mutate", mutation: edit("A"), coalesceKey: "name", at: 0 });
    s = historyReducer(s, { type: "mutate", mutation: edit("AB"), coalesceKey: "name", at: 5000 });
    expect(s.past).toHaveLength(2);
  });

  it("redo restores, and a new edit clears the redo stack", () => {
    let s = initHistory(newDoc());
    s = historyReducer(s, { type: "mutate", mutation: edit("A"), at: 0 });
    s = historyReducer(s, { type: "undo" });
    s = historyReducer(s, { type: "redo" });
    expect(s.present.data.basics.values.fullName).toBe("A");
    s = historyReducer(s, { type: "undo" });
    s = historyReducer(s, { type: "mutate", mutation: edit("B"), at: 10 });
    expect(s.future).toHaveLength(0);
  });

  it("a mutation that changes nothing is not recorded", () => {
    const s = initHistory(newDoc());
    const next = historyReducer(s, { type: "mutate", mutation: setTemplate("classic"), at: 0 });
    expect(next).toBe(s);
  });

  it("bumps the revision on every real change, including undo", () => {
    let s = initHistory(newDoc());
    s = historyReducer(s, { type: "mutate", mutation: edit("A"), at: 0 });
    const afterEdit = s.revision;
    s = historyReducer(s, { type: "undo" });
    expect(s.revision).toBeGreaterThan(afterEdit);
  });
});

describe("loading data from the server", () => {
  it("falls back to the default sections when the stored data is not usable", () => {
    for (const bad of [null, undefined, 42, "text", [], { sections: "nope" }, { basics: 5 }]) {
      const data = normaliseData(bad);
      expect(data.sections.length).toBeGreaterThan(0);
      expect(data.basics.photo).toBeNull();
    }
  });

  it("drops junk entries but keeps a deliberately empty list empty", () => {
    expect(normaliseData({ sections: [null, 3, "x"] }).sections).toHaveLength(0);
    // A user may delete every section. That must not bring the defaults back after a reload.
    expect(normaliseData({ sections: [] }).sections).toHaveLength(0);
  });

  it("drops unknown section types and repairs missing ids and items", () => {
    const data = normaliseData({
      sections: [
        { type: "hacker-section", items: [] },
        { type: "experience", items: [] },
      ],
    });
    expect(data.sections).toHaveLength(1);
    expect(data.sections[0].id).toBeTruthy();
    expect(data.sections[0].items).toHaveLength(1);
    expect(data.sections[0].title).toBe("Experience");
  });

  it("only accepts image data URLs for the photo", () => {
    expect(normaliseData({ basics: { photo: "https://evil.example/x.png" } }).basics.photo).toBeNull();
    expect(normaliseData({ basics: { photo: "javascript:alert(1)" } }).basics.photo).toBeNull();
    expect(normaliseData({ basics: { photo: "data:image/jpeg;base64,AAAA" } }).basics.photo).toBe(
      "data:image/jpeg;base64,AAAA",
    );
  });

  it("keeps design settings in their allowed ranges", () => {
    const d = normaliseDesign({ font: "comic-sans", fontSize: 99, accent: "red; background:url(x)", spacing: "huge" });
    expect(d).toEqual(DEFAULT_DESIGN);
    expect(normaliseDesign({ font: "lato", fontSize: 11, accent: "#112233", spacing: "compact" })).toEqual({
      font: "lato",
      fontSize: 11,
      accent: "#112233",
      spacing: "compact",
    });
  });
});
