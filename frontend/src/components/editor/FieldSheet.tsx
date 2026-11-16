"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { FieldsChecklist } from "@/components/resume/visual/Actions";
import { editKey } from "@/components/resume/Editable";
import { describeRef, parseFocusKey } from "@/lib/resume/fieldAccess";
import {
  applyEdit,
  moveItem,
  moveSection,
  removeItem,
  removeSection,
  setPhoto,
  toggleItemHidden,
  toggleSectionHidden,
  toggleSectionPageBreak,
} from "@/lib/resume/mutations";
import { BASICS_FIELDS, SECTION_SCHEMAS } from "@/lib/resume/schemas";
import { targetForRef } from "@/lib/resume/styleTargets";
import { columnOf, getTemplate, sectionNeighbours } from "@/lib/resume/templates";
import type { ResumeDoc } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";
import { StyleControls } from "./StyleControls";

type Tab = "text" | "style" | "block";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

function Big({
  children,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium disabled:opacity-40 ${danger ? "border-red-200 text-red-700" : "border-slate-300 text-slate-800"}`}
    >
      {children}
    </button>
  );
}

/**
 * The phone's editor for one piece of text: a sheet at the bottom of the screen with a real-sized input,
 * the style controls, and the tools of the entry and section it belongs to. The page above stays visible
 * and shows the change as you type.
 */
export function FieldSheet({
  doc,
  edit,
  fieldKey,
  onClose,
  onNavigate,
  onHeight,
  pickPhoto,
}: {
  doc: ResumeDoc;
  edit: Edit;
  fieldKey: string;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  /** Tells the page how much room the sheet takes, so the page can scroll clear of it. */
  onHeight: (px: number) => void;
  pickPhoto: () => void;
}) {
  // The tab belongs to one field: moving to another field starts on Text again.
  const [tabState, setTabState] = useState<{ key: string; tab: Tab }>({ key: fieldKey, tab: "text" });
  const tab: Tab = tabState.key === fieldKey ? tabState.tab : "text";
  const setTab = (next: Tab) => setTabState({ key: fieldKey, tab: next });
  const [keyboard, setKeyboard] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const ref = parseFocusKey(fieldKey);
  const info = ref ? describeRef(doc, ref) : null;

  // The field was deleted or hidden away: nothing left to edit.
  useEffect(() => {
    if (!info) onClose();
  }, [info, onClose]);

  // A new field gets the cursor in its input.
  useEffect(() => {
    field.current?.focus();
  }, [fieldKey]);

  // Lift the sheet above the on-screen keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboard(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Report the height (plus keyboard) so the page leaves room below its last line.
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const report = () => onHeight(el.offsetHeight + keyboard);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => {
      ro.disconnect();
      onHeight(0);
    };
  }, [keyboard, onHeight]);

  if (!ref || !info) return null;

  const target = targetForRef(doc, ref);
  const template = getTemplate(doc.templateId);
  const sectionId = ref.kind === "item" || ref.kind === "itemCustom" || ref.kind === "sectionTitle" ? ref.sectionId : null;
  const section = sectionId ? doc.data.sections.find((s) => s.id === sectionId) : undefined;
  const itemId = ref.kind === "item" || ref.kind === "itemCustom" ? ref.itemId : null;
  const item = section && itemId ? section.items.find((i) => i.id === itemId) : undefined;

  const onChange = (text: string) => edit(applyEdit(ref, text), editKey(ref));

  return (
    <div
      ref={sheet}
      role="dialog"
      aria-label="Edit field"
      style={{ bottom: keyboard }}
      className="fixed inset-x-0 z-30 flex max-h-[62vh] flex-col rounded-t-2xl border-t border-slate-300 bg-white shadow-2xl"
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{info.label}</p>
        </div>
        <button
          type="button"
          aria-label="Previous field"
          onClick={() => onNavigate(-1)}
          className="h-10 w-10 rounded-lg border border-slate-300 text-lg text-slate-700"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next field"
          onClick={() => onNavigate(1)}
          className="h-10 w-10 rounded-lg border border-slate-300 text-lg text-slate-700"
        >
          ›
        </button>
        <button type="button" onClick={onClose} className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white">
          Done
        </button>
      </div>

      <div className="mt-2 flex gap-1 px-3" role="tablist" aria-label="What to change">
        {(
          [
            ["text", "Text"],
            ["style", "Style"],
            ["block", "Block"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-9 flex-1 rounded-md text-sm font-medium ${tab === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {tab === "text" && (
          <div>
            {info.kind === "text" ? (
              <input
                ref={field}
                aria-label={info.label}
                className={inputClass}
                value={info.value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onNavigate(1);
                  }
                }}
                enterKeyHint="next"
              />
            ) : (
              <textarea
                ref={field}
                aria-label={info.label}
                className={inputClass}
                rows={info.kind === "bullets" ? 5 : 3}
                value={info.value}
                onChange={(e) => onChange(e.target.value)}
              />
            )}
            {info.hint && <p className="mt-1 text-xs text-slate-500">{info.hint}</p>}
          </div>
        )}

        {tab === "style" &&
          (target ? (
            <StyleControls target={target} style={doc.design.styles[target]} edit={edit} />
          ) : (
            <p className="text-sm text-slate-600">This text has no style of its own.</p>
          ))}

        {tab === "block" && (
          <div className="space-y-4">
            {section && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Section: {section.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const { prevId, nextId } = sectionNeighbours(template, doc.data.sections, section.id);
                    return (
                      <>
                        <Big label="Move section up" disabled={!prevId} onClick={() => edit(moveSection(section.id, prevId!))}>
                          ↑ Move up
                        </Big>
                        <Big label="Move section down" disabled={!nextId} onClick={() => edit(moveSection(section.id, nextId!))}>
                          ↓ Move down
                        </Big>
                      </>
                    );
                  })()}
                  {columnOf(template, section) === "main" && (
                    <Big label="Page break" onClick={() => edit(toggleSectionPageBreak(section.id))}>
                      {section.pageBreakBefore ? "Remove page break" : "Start on a new page"}
                    </Big>
                  )}
                  <Big
                    label="Hide section"
                    onClick={() => {
                      edit(toggleSectionHidden(section.id));
                      onClose();
                    }}
                  >
                    Hide section
                  </Big>
                  <Big
                    danger
                    label="Delete section"
                    onClick={() => {
                      edit(removeSection(section.id));
                      onClose();
                    }}
                  >
                    Delete section
                  </Big>
                </div>
              </div>
            )}

            {section && item && !SECTION_SCHEMAS[section.type].singleItem && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">This entry</p>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const at = section.items.findIndex((i) => i.id === item.id);
                    const prevId = section.items[at - 1]?.id;
                    const nextId = section.items[at + 1]?.id;
                    return (
                      <>
                        <Big label="Move entry up" disabled={!prevId} onClick={() => edit(moveItem(section.id, item.id, prevId!))}>
                          ↑ Move up
                        </Big>
                        <Big label="Move entry down" disabled={!nextId} onClick={() => edit(moveItem(section.id, item.id, nextId!))}>
                          ↓ Move down
                        </Big>
                      </>
                    );
                  })()}
                  <Big
                    label="Hide entry"
                    onClick={() => {
                      edit(toggleItemHidden(section.id, item.id));
                      onClose();
                    }}
                  >
                    Hide entry
                  </Big>
                  <Big
                    danger
                    label="Delete entry"
                    onClick={() => {
                      edit(removeItem(section.id, item.id));
                      onClose();
                    }}
                  >
                    Delete entry
                  </Big>
                </div>
              </div>
            )}

            {section && item && (
              <FieldsChecklist
                large
                target={{ kind: "item", sectionId: section.id, itemId: item.id }}
                fs={item}
                fields={SECTION_SCHEMAS[section.type].fields}
                edit={edit}
              />
            )}

            {(ref.kind === "basics" || ref.kind === "basicsCustom") && (
              <div className="space-y-4">
                <FieldsChecklist large target={{ kind: "basics" }} fs={doc.data.basics} fields={BASICS_FIELDS} edit={edit} />
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Photo</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Big label="Change photo" onClick={pickPhoto}>
                      {doc.data.basics.photo ? "Change photo" : "Add photo"}
                    </Big>
                    {doc.data.basics.photo && (
                      <Big danger label="Remove photo" onClick={() => edit(setPhoto(null))}>
                        Remove photo
                      </Big>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
