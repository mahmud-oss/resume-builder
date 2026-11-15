import { produce } from "immer";
import { arrayMove } from "@dnd-kit/sortable";

import { newId, newItem, newSection } from "./defaults";
import type { IconChoice, IconRef } from "./icons";
import { getTemplate } from "./templates";
import type { Design, EditRef, FieldSet, ResumeDoc, Section, SectionType, StyleTarget, TextStyle } from "./types";

/**
 * Every edit is a pure function from one document to the next. That is what makes undo/redo,
 * in-preview editing and autosave simple: they all go through the same functions.
 */
export type Mutation = (doc: ResumeDoc) => ResumeDoc;

/** Where a group of fields lives: the resume header, or one entry in a section. */
export type FieldTarget = { kind: "basics" } | { kind: "item"; sectionId: string; itemId: string };

function findSection(doc: ResumeDoc, id: string): Section | undefined {
  return doc.data.sections.find((s) => s.id === id);
}

function findFieldSet(doc: ResumeDoc, target: FieldTarget): FieldSet | undefined {
  if (target.kind === "basics") return doc.data.basics;
  return findSection(doc, target.sectionId)?.items.find((i) => i.id === target.itemId);
}

// --- document-level ---------------------------------------------------------------------

export const setTitle =
  (title: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      d.title = title;
    });

/** Switches template. Content and hidden fields are untouched; the look becomes the new template's default theme. */
export const setTemplate =
  (templateId: string): Mutation =>
  (doc) =>
    doc.templateId === templateId ? doc : { ...doc, templateId, design: getTemplate(templateId).design };

/** Replaces the whole look, for example with one of a template's themes. */
export const applyDesign =
  (design: Design): Mutation =>
  (doc) =>
    doc.design === design ? doc : { ...doc, design };

/** Puts one part back to how the current template's default theme styles it. */
export const resetTextStyle =
  (target: StyleTarget): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      d.design.styles[target] = { ...getTemplate(d.templateId).design.styles[target] };
    });

export const setTextStyle =
  (target: StyleTarget, patch: Partial<TextStyle>): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      Object.assign(d.design.styles[target], patch);
    });

export const setDesign =
  (patch: Partial<Design>): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      Object.assign(d.design, patch);
    });

// --- text edits (form fields and in-preview editing both use this) -----------------------

export const applyEdit =
  (ref: EditRef, text: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      switch (ref.kind) {
        case "basics":
          d.data.basics.values[ref.field] = text;
          break;
        case "basicsCustom": {
          const c = d.data.basics.custom.find((x) => x.id === ref.id);
          if (c) c.value = text;
          break;
        }
        case "item": {
          const item = d.data.sections.find((s) => s.id === ref.sectionId)?.items.find((i) => i.id === ref.itemId);
          if (item) item.values[ref.field] = text;
          break;
        }
        case "itemCustom": {
          const item = d.data.sections.find((s) => s.id === ref.sectionId)?.items.find((i) => i.id === ref.itemId);
          const c = item?.custom.find((x) => x.id === ref.id);
          if (c) c.value = text;
          break;
        }
        case "sectionTitle": {
          const s = d.data.sections.find((x) => x.id === ref.sectionId);
          if (s) s.title = text;
          break;
        }
      }
    });

export const setPhoto =
  (photo: string | null): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      d.data.basics.photo = photo;
    });

// --- show / hide -------------------------------------------------------------------------

export const toggleFieldHidden =
  (target: FieldTarget, field: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const fs = findFieldSet(d, target);
      if (!fs) return;
      if (fs.hiddenFields[field]) delete fs.hiddenFields[field];
      else fs.hiddenFields[field] = true;
    });

export const toggleCustomFieldHidden =
  (target: FieldTarget, fieldId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const c = findFieldSet(d, target)?.custom.find((x) => x.id === fieldId);
      if (c) c.hidden = c.hidden ? undefined : true;
    });

export const toggleSectionHidden =
  (sectionId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const s = findSection(d, sectionId);
      if (s) s.hidden = s.hidden ? undefined : true;
    });

export const toggleItemHidden =
  (sectionId: string, itemId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const item = findSection(d, sectionId)?.items.find((i) => i.id === itemId);
      if (item) item.hidden = item.hidden ? undefined : true;
    });

export const toggleSectionPageBreak =
  (sectionId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const s = findSection(d, sectionId);
      if (s) s.pageBreakBefore = s.pageBreakBefore ? undefined : true;
    });

// --- custom fields -----------------------------------------------------------------------

/** Adds an empty field of the user's own. Pass an id when the caller needs to find it afterwards. */
export const addCustomField =
  (target: FieldTarget, id: string = newId()): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      findFieldSet(d, target)?.custom.push({ id, value: "" });
    });

export const removeCustomField =
  (target: FieldTarget, fieldId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const fs = findFieldSet(d, target);
      if (fs) fs.custom = fs.custom.filter((c) => c.id !== fieldId);
    });

// --- sections and items ------------------------------------------------------------------

/**
 * Adds a section at the end. Pass an id when the caller needs to find it afterwards, and a column when it
 * must stay in the sidebar (or main column) of a sidebar template.
 */
export const addSection =
  (type: SectionType, id?: string, column?: "main" | "side"): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const section = newSection(type);
      if (id) section.id = id;
      if (column) section.column = column;
      d.data.sections.push(section);
    });

export const removeSection =
  (sectionId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      d.data.sections = d.data.sections.filter((s) => s.id !== sectionId);
    });

export const moveSection =
  (fromId: string, toId: string): Mutation =>
  (doc) => {
    const from = doc.data.sections.findIndex((s) => s.id === fromId);
    const to = doc.data.sections.findIndex((s) => s.id === toId);
    if (from < 0 || to < 0 || from === to) return doc;
    return produce(doc, (d) => {
      d.data.sections = arrayMove(d.data.sections, from, to);
    });
  };

export const addItem =
  (sectionId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      findSection(d, sectionId)?.items.push(newItem());
    });

export const removeItem =
  (sectionId: string, itemId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const s = findSection(d, sectionId);
      if (!s) return;
      s.items = s.items.filter((i) => i.id !== itemId);
      if (s.items.length === 0) s.items.push(newItem());
    });

/** Adds an empty entry directly below another one. */
export const addItemAfter =
  (sectionId: string, afterItemId: string): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const s = findSection(d, sectionId);
      if (!s) return;
      const at = s.items.findIndex((i) => i.id === afterItemId);
      s.items.splice(at < 0 ? s.items.length : at + 1, 0, newItem());
    });

/** Chooses the icon for a standard contact field; null goes back to its default. */
export const setFieldIcon =
  (field: string, choice: IconChoice | null): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const icons = { ...(d.data.basics.icons ?? {}) };
      if (choice === null) delete icons[field];
      else icons[field] = choice;
      if (Object.keys(icons).length > 0) d.data.basics.icons = icons;
      else delete d.data.basics.icons;
    });

/** Chooses the icon for one of the user's own fields; null removes it. */
export const setCustomIcon =
  (target: FieldTarget, fieldId: string, icon: IconRef | null): Mutation =>
  (doc) =>
    produce(doc, (d) => {
      const c = findFieldSet(d, target)?.custom.find((x) => x.id === fieldId);
      if (!c) return;
      if (icon === null) delete c.icon;
      else c.icon = icon;
    });

export const moveItem =
  (sectionId: string, fromId: string, toId: string): Mutation =>
  (doc) => {
    const s = findSection(doc, sectionId);
    if (!s) return doc;
    const from = s.items.findIndex((i) => i.id === fromId);
    const to = s.items.findIndex((i) => i.id === toId);
    if (from < 0 || to < 0 || from === to) return doc;
    return produce(doc, (d) => {
      const sec = findSection(d, sectionId);
      if (sec) sec.items = arrayMove(sec.items, from, to);
    });
  };
