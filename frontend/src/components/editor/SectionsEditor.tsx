"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";

import {
  addItem,
  addSection,
  applyEdit,
  moveItem,
  moveSection,
  removeItem,
  removeSection,
  toggleItemHidden,
  toggleSectionHidden,
  toggleSectionPageBreak,
} from "@/lib/resume/mutations";
import { ADDABLE_SECTIONS, SECTION_SCHEMAS } from "@/lib/resume/schemas";
import type { Item, Section } from "@/lib/resume/types";
import { editKey } from "@/components/resume/Editable";

import { FieldSetEditor, type Edit } from "./FieldEditors";
import { ChevronIcon, EyeIcon, EyeOffIcon, PageBreakIcon, TrashIcon } from "./Icons";
import { SortableCard } from "./SortableCard";
import { StyleControls } from "./StyleControls";
import { useStyleUi } from "./StyleUi";
import { IconButton, inputClass } from "./ui";

function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function ItemCard({ section, item, edit, canRemove }: { section: Section; item: Item; edit: Edit; canRemove: boolean }) {
  const schema = SECTION_SCHEMAS[section.type];
  const headline = (schema.title && item.values[schema.title]) || (schema.rowLabel && item.values[schema.rowLabel]) || "";
  return (
    <SortableCard id={item.id} className="rounded-md border border-slate-200 bg-white">
      {(grip) => (
        <>
          <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1">
            {!schema.singleItem && grip}
            <span className={`min-w-0 flex-1 truncate text-sm ${item.hidden ? "text-slate-400 line-through" : "font-medium"}`}>
              {headline || <span className="font-normal text-slate-400">New {schema.itemLabel}</span>}
            </span>
            <IconButton
              label={item.hidden ? "Show this entry on CV" : "Hide this entry from CV"}
              onClick={() => edit(toggleItemHidden(section.id, item.id))}
            >
              {item.hidden ? <EyeOffIcon /> : <EyeIcon />}
            </IconButton>
            {canRemove && (
              <IconButton label="Delete this entry" onClick={() => edit(removeItem(section.id, item.id))}>
                <TrashIcon />
              </IconButton>
            )}
          </div>
          <div className="p-3">
            <FieldSetEditor
              fs={item}
              fields={schema.fields}
              target={{ kind: "item", sectionId: section.id, itemId: item.id }}
              valueRef={(field) => ({ kind: "item", sectionId: section.id, itemId: item.id, field })}
              customRef={(id, part) => ({ kind: "itemCustom", sectionId: section.id, itemId: item.id, id, part })}
              edit={edit}
              idPrefix={`item-${item.id}`}
              scope={section.type}
            />
          </div>
        </>
      )}
    </SortableCard>
  );
}

function SectionCard({ section, edit }: { section: Section; edit: Edit }) {
  const [open, setOpen] = useState(true);
  const [styling, setStyling] = useState(false);
  const styleUi = useStyleUi();
  const sensors = useDragSensors();
  const schema = SECTION_SCHEMAS[section.type];
  const titleRef = { kind: "sectionTitle", sectionId: section.id } as const;

  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id) edit(moveItem(section.id, String(e.active.id), String(e.over.id)));
  }

  return (
    <SortableCard id={section.id} className="rounded-lg border border-slate-200 bg-white">
      {(grip) => (
        <>
          <div className="flex items-center gap-1 px-2 py-2">
            {grip}
            <IconButton label={open ? "Collapse section" : "Expand section"} onClick={() => setOpen(!open)}>
              <ChevronIcon open={open} />
            </IconButton>
            <input
              aria-label="Section title"
              className={`${inputClass} !border-transparent font-semibold hover:!border-slate-300 ${section.hidden ? "opacity-50" : ""}`}
              value={section.title}
              onChange={(e) => edit(applyEdit(titleRef, e.target.value), editKey(titleRef))}
            />
            {styleUi.enabled && (
              <button
                type="button"
                aria-label="Style section headings"
                title="Font and style"
                aria-expanded={styling}
                onClick={() => setStyling(!styling)}
                className={`h-8 rounded px-1.5 text-xs font-semibold hover:bg-slate-100 ${styling ? "bg-slate-100 text-brand" : "text-slate-600"}`}
              >
                Aa
              </button>
            )}
            <IconButton
              label={section.pageBreakBefore ? "Remove page break before this section" : "Start this section on a new page"}
              active={!!section.pageBreakBefore}
              onClick={() => edit(toggleSectionPageBreak(section.id))}
            >
              <PageBreakIcon />
            </IconButton>
            <IconButton
              label={section.hidden ? "Show section on CV" : "Hide section from CV"}
              onClick={() => edit(toggleSectionHidden(section.id))}
            >
              {section.hidden ? <EyeOffIcon /> : <EyeIcon />}
            </IconButton>
            <IconButton label="Delete section" onClick={() => edit(removeSection(section.id))}>
              <TrashIcon />
            </IconButton>
          </div>
          {styleUi.enabled && styling && (
            <div className="px-3 pb-3">
              <StyleControls target="heading" style={styleUi.styles.heading} edit={edit} />
            </div>
          )}
          {open && (
            <div className="space-y-3 border-t border-slate-100 p-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={section.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {section.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      section={section}
                      item={item}
                      edit={edit}
                      canRemove={!schema.singleItem && section.items.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {!schema.singleItem && (
                <button
                  type="button"
                  onClick={() => edit(addItem(section.id))}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  + Add {schema.itemLabel}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </SortableCard>
  );
}

export function SectionsEditor({ sections, edit }: { sections: Section[]; edit: Edit }) {
  const sensors = useDragSensors();
  const [menu, setMenu] = useState(false);

  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id) edit(moveSection(String(e.active.id), String(e.over.id)));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((s) => (
            <SectionCard key={s.id} section={s} edit={edit} />
          ))}
        </SortableContext>
      </DndContext>

      <div className="relative">
        <button
          type="button"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
          className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-brand hover:bg-white"
        >
          + Add section
        </button>
        {menu && (
          <ul className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2">
            {ADDABLE_SECTIONS.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => {
                    edit(addSection(type));
                    setMenu(false);
                  }}
                  className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-slate-100"
                >
                  {SECTION_SCHEMAS[type].label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
