import { describe, expect, it } from "vitest";

import { newDoc } from "./doc";
import { mergeLineUp, splitLineAt } from "./lines";
import { addItemAfter, addSection } from "./mutations";

describe("bullet lines on the page", () => {
  it("Enter in the middle splits the line", () => {
    expect(splitLineAt("Built a thing\nShipped it", 0, 5)).toEqual({ value: "Built\n a thing\nShipped it", focusIndex: 1 });
  });

  it("Enter at the end adds an empty line below", () => {
    expect(splitLineAt("One\nTwo", 1, 3)).toEqual({ value: "One\nTwo\n", focusIndex: 2 });
  });

  it("Enter on empty text gives two empty lines and keeps the cursor on the new one", () => {
    expect(splitLineAt("", 0, 0)).toEqual({ value: "\n", focusIndex: 1 });
  });

  it("clamps a cursor offset that is out of range", () => {
    expect(splitLineAt("Hi", 0, 99).value).toBe("Hi\n");
  });

  it("Backspace at the start joins a line onto the one above", () => {
    expect(mergeLineUp("One\nTwo\nThree", 1)).toEqual({ value: "OneTwo\nThree", focusIndex: 0 });
  });

  it("does nothing on the first line or a missing line", () => {
    expect(mergeLineUp("One\nTwo", 0)).toBeNull();
    expect(mergeLineUp("One", 5)).toBeNull();
  });
});

describe("adding on the page", () => {
  it("adds an entry directly below the chosen one", () => {
    let doc = newDoc();
    const exp = doc.data.sections.find((s) => s.type === "experience")!;
    doc = addItemAfter(exp.id, exp.items[0].id)(doc);
    doc = addItemAfter(exp.id, exp.items[0].id)(doc);
    const items = doc.data.sections.find((s) => s.id === exp.id)!.items;
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe(exp.items[0].id);
  });

  it("adds a section at the end of the CV", () => {
    const doc = newDoc();
    const next = addSection("certifications")(doc);
    expect(next.data.sections).toHaveLength(doc.data.sections.length + 1);
    expect(next.data.sections.at(-1)!.type).toBe("certifications");
    expect(next.data.sections.slice(0, -1)).toEqual(doc.data.sections);
  });
});

describe("contact icons", () => {
  it("are off until the user turns them on", async () => {
    const { DEFAULT_DESIGN, normaliseDesign } = await import("./design");
    expect(DEFAULT_DESIGN.contactIcons).toBe(false);
    expect(normaliseDesign({}).contactIcons).toBe(false);
    expect(normaliseDesign({ contactIcons: true }).contactIcons).toBe(true);
    expect(normaliseDesign({ contactIcons: "yes" }).contactIcons).toBe(false);
  });

  it("keeps the choice for a field, and none, and can go back to the default", async () => {
    const { setFieldIcon } = await import("./mutations");
    let doc = setFieldIcon("phone", "star")(newDoc());
    expect(doc.data.basics.icons).toEqual({ phone: "star" });
    doc = setFieldIcon("email", "none")(doc);
    expect(doc.data.basics.icons).toEqual({ phone: "star", email: "none" });
    doc = setFieldIcon("phone", null)(doc);
    doc = setFieldIcon("email", null)(doc);
    expect(doc.data.basics.icons).toBeUndefined();
  });

  it("sets and removes the icon of the user's own field", async () => {
    const { addCustomField, setCustomIcon } = await import("./mutations");
    let doc = addCustomField({ kind: "basics" })(newDoc());
    const id = doc.data.basics.custom[0].id;
    doc = setCustomIcon({ kind: "basics" }, id, "github")(doc);
    expect(doc.data.basics.custom[0].icon).toBe("github");
    doc = setCustomIcon({ kind: "basics" }, id, null)(doc);
    expect(doc.data.basics.custom[0].icon).toBeUndefined();
  });

  it("drops unknown icons when reading saved data", async () => {
    const { normaliseData } = await import("./defaults");
    const data = normaliseData({
      basics: { icons: { phone: "star", email: "rocket", fax: "none" }, custom: [{ id: "a", label: "x", value: "y", icon: "bogus" }, { id: "b", label: "x", value: "y", icon: "globe" }] },
    });
    expect(data.basics.icons).toEqual({ phone: "star", fax: "none" });
    expect(data.basics.custom[0].icon).toBeUndefined();
    expect(data.basics.custom[1].icon).toBe("globe");
  });
});

describe("a larger icon library and emoji", () => {
  it("offers plenty of unique icons in groups", async () => {
    const { ICON_DEFS, ICON_GROUPS } = await import("./icons");
    expect(ICON_DEFS.length).toBeGreaterThanOrEqual(45);
    expect(new Set(ICON_DEFS.map((d) => d.id)).size).toBe(ICON_DEFS.length);
    for (const g of ICON_GROUPS) expect(ICON_DEFS.some((d) => d.group === g)).toBe(true);
    for (const d of ICON_DEFS) expect(ICON_GROUPS).toContain(d.group);
  });

  it("accepts emoji, flags and joined emoji, and nothing else", async () => {
    const { isEmoji, toEmojiRef } = await import("./icons");
    for (const ok of ["📞", "✉️", "🇧🇩", "👨‍💻", "🗣️", "👍🏽"]) expect(isEmoji(ok)).toBe(true);
    for (const bad of ["", "a", "a📞", "📞 x", "1", "<b>", "📞".repeat(20)]) expect(isEmoji(bad)).toBe(false);
    expect(toEmojiRef("  📞 ")).toBe("emoji:📞");
    expect(toEmojiRef("hello")).toBeNull();
  });

  it("keeps a chosen emoji in saved data and drops anything that is not one", async () => {
    const { normaliseData } = await import("./defaults");
    const data = normaliseData({
      basics: {
        icons: { phone: "emoji:📞", email: "emoji:abc", fax: "emoji:<script>" },
        custom: [{ id: "a", label: "x", value: "y", icon: "emoji:🌐" }, { id: "b", label: "x", value: "y", icon: "emoji:hello" }],
      },
    });
    expect(data.basics.icons).toEqual({ phone: "emoji:📞" });
    expect(data.basics.custom[0].icon).toBe("emoji:🌐");
    expect(data.basics.custom[1].icon).toBeUndefined();
  });

  it("lets a caller choose the id of a new own field so it can be found right away", async () => {
    const { addCustomField } = await import("./mutations");
    const doc = addCustomField({ kind: "basics" }, "fixed-id")(newDoc());
    expect(doc.data.basics.custom.map((c) => c.id)).toEqual(["fixed-id"]);
  });
});

describe("which sections each column offers", () => {
  it("one-column templates offer everything in the main column and nothing for a sidebar", async () => {
    const { TEMPLATES, sectionTypesFor } = await import("./templates");
    const { ADDABLE_SECTIONS } = await import("./schemas");
    for (const t of TEMPLATES.filter((x) => x.layout === "single")) {
      expect(sectionTypesFor(t, "main")).toEqual(ADDABLE_SECTIONS);
      expect(sectionTypesFor(t, "side")).toEqual([]);
    }
  });

  it("a sidebar template splits the types between its columns; only the flexible ones are in both", async () => {
    const { TEMPLATES, sectionTypesFor } = await import("./templates");
    const { ADDABLE_SECTIONS } = await import("./schemas");
    const sidebars = TEMPLATES.filter((x) => x.layout === "sidebar");
    expect(sidebars.length).toBeGreaterThan(0);
    for (const t of sidebars) {
      const main = sectionTypesFor(t, "main");
      const side = sectionTypesFor(t, "side");
      expect(side).toEqual(expect.arrayContaining(["certifications", "custom"]));
      expect(main).toContain("custom");
      expect(main.filter((m) => side.includes(m))).toEqual(t.bothColumns ?? []);
      expect([...new Set([...main, ...side])].sort()).toEqual([...ADDABLE_SECTIONS].sort());
    }
  });

  it("adds a section with the id the caller chose, at the end", async () => {
    const { addSection } = await import("./mutations");
    const doc = addSection("certifications", "fixed")(newDoc());
    expect(doc.data.sections.at(-1)).toMatchObject({ id: "fixed", type: "certifications" });
  });
});

describe("remembering the column of a section", () => {
  it("sidebar types go to the sidebar by default and everything else to the main column", async () => {
    const { getTemplate, columnOf } = await import("./templates");
    const modern = getTemplate("modern");
    expect(columnOf(modern, { type: "skills" })).toBe("side");
    expect(columnOf(modern, { type: "experience" })).toBe("main");
    expect(columnOf(modern, { type: "custom" })).toBe("main");
  });

  it("a custom section remembers the sidebar, and can be explicitly main", async () => {
    const { getTemplate, columnOf } = await import("./templates");
    const modern = getTemplate("modern");
    expect(columnOf(modern, { type: "custom", column: "side" })).toBe("side");
    expect(columnOf(modern, { type: "custom", column: "main" })).toBe("main");
  });

  it("ignores a remembered column the template does not allow", async () => {
    const { getTemplate, columnOf } = await import("./templates");
    const modern = getTemplate("modern");
    expect(columnOf(modern, { type: "experience", column: "side" })).toBe("main");
    expect(columnOf(modern, { type: "skills", column: "main" })).toBe("side");
  });

  it("one-column templates always use the main column, and keep the choice for when you switch back", async () => {
    const { getTemplate, columnOf } = await import("./templates");
    expect(columnOf(getTemplate("classic"), { type: "custom", column: "side" })).toBe("main");
  });

  it("only stores a column when the type alone would not put the section there", async () => {
    const { getTemplate, columnToStore } = await import("./templates");
    const modern = getTemplate("modern");
    expect(columnToStore(modern, "custom", "side")).toBe("side");
    expect(columnToStore(modern, "custom", "main")).toBeUndefined();
    expect(columnToStore(modern, "certifications", "side")).toBeUndefined();
    expect(columnToStore(getTemplate("classic"), "custom", "main")).toBeUndefined();
  });

  it("saves the column with the section and repairs nonsense when loading", async () => {
    const { addSection } = await import("./mutations");
    const { normaliseData } = await import("./defaults");
    const doc = addSection("custom", "c1", "side")(newDoc());
    expect(doc.data.sections.at(-1)).toMatchObject({ id: "c1", column: "side" });
    const loaded = normaliseData({ basics: {}, sections: [{ id: "a", type: "custom", title: "x", column: "side", items: [] }, { id: "b", type: "custom", title: "y", column: "bogus", items: [] }] });
    expect(loaded.sections[0].column).toBe("side");
    expect(loaded.sections[1].column).toBeUndefined();
  });
});

describe("custom fields are one piece of text", () => {
  it("folds an older name and value into one line, so nothing visible changes", async () => {
    const { normaliseData } = await import("./defaults");
    const data = normaliseData({
      basics: { custom: [{ id: "a", label: "Nationality", value: "Bangladeshi" }, { id: "b", label: "", value: "Open to relocate" }, { id: "c", label: "Only a name", value: "" }] },
      sections: [{ id: "s", type: "experience", title: "x", items: [{ id: "i", custom: [{ id: "d", label: "GPA", value: "3.8" }] }] }],
    });
    expect(data.basics.custom.map((c) => c.value)).toEqual(["Nationality: Bangladeshi", "Open to relocate", ""]);
    expect(data.sections[0].items[0].custom[0].value).toBe("GPA: 3.8");
    for (const c of data.basics.custom) expect(c).not.toHaveProperty("label");
  });

  it("a new field has only a value, and editing sets it", async () => {
    const { addCustomField, applyEdit } = await import("./mutations");
    let doc = addCustomField({ kind: "basics" }, "n")(newDoc());
    expect(doc.data.basics.custom[0]).toEqual({ id: "n", value: "" });
    doc = applyEdit({ kind: "basicsCustom", id: "n" }, "Driving licence: A")(doc);
    expect(doc.data.basics.custom[0].value).toBe("Driving licence: A");
  });
});
