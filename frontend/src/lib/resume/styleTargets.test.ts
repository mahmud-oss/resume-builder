import { describe, expect, it } from "vitest";

import { newDoc } from "./doc";
import { resetTextStyle, setTemplate, setTextStyle } from "./mutations";
import { STYLE_TARGETS } from "./design";
import { targetForField, targetForRef } from "./styleTargets";
import type { StyleTarget } from "./types";

describe("which part of the CV a field belongs to", () => {
  it("maps header fields", () => {
    expect(targetForField("basics", "fullName")).toBe("name");
    expect(targetForField("basics", "headline")).toBe("headline");
    expect(targetForField("basics", "phone")).toBe("contact");
  });

  it("maps entry fields the same way in every section", () => {
    expect(targetForField("experience", "role")).toBe("itemTitle");
    expect(targetForField("education", "degree")).toBe("itemTitle");
    expect(targetForField("projects", "name")).toBe("itemTitle");
    expect(targetForField("experience", "company")).toBe("subtitle");
    expect(targetForField("education", "institution")).toBe("subtitle");
    expect(targetForField("experience", "location")).toBe("location");
    expect(targetForField("experience", "startDate")).toBe("dates");
    expect(targetForField("experience", "endDate")).toBe("dates");
    expect(targetForField("experience", "description")).toBe("bullets");
    expect(targetForField("summary", "text")).toBe("summary");
    expect(targetForField("skills", "category")).toBe("skillLabel");
    expect(targetForField("languages", "level")).toBe("skillValue");
  });

  it("gives every field of every section a known part", () => {
    const known = new Set<StyleTarget>(STYLE_TARGETS.map((t) => t.id));
    expect(known.size).toBe(12);
    const doc = newDoc();
    for (const section of doc.data.sections) {
      expect(known.has(targetForRef(doc, { kind: "sectionTitle", sectionId: section.id })!)).toBe(true);
    }
  });

  it("finds the part behind text in the preview", () => {
    const doc = newDoc();
    const exp = doc.data.sections.find((s) => s.type === "experience")!;
    expect(targetForRef(doc, { kind: "item", sectionId: exp.id, itemId: exp.items[0].id, field: "role" })).toBe("itemTitle");
    expect(targetForRef(doc, { kind: "item", sectionId: "gone", itemId: "x", field: "role" })).toBeNull();
  });
});

describe("font and size per part", () => {
  it("sets a font and size on one part only", () => {
    const doc = setTextStyle("itemTitle", { font: "lato", scale: 1.3 })(newDoc());
    expect(doc.design.styles.itemTitle).toMatchObject({ font: "lato", scale: 1.3 });
    expect(doc.design.styles.name.font).toBeNull();
  });

  it("resets a part to the template's default theme", () => {
    let doc = setTemplate("executive")(newDoc());
    const original = doc.design.styles.heading;
    doc = setTextStyle("heading", { italic: true, font: "inter" })(doc);
    expect(doc.design.styles.heading).not.toEqual(original);
    expect(resetTextStyle("heading")(doc).design.styles.heading).toEqual(original);
  });
});
