"use client";

import { useContext, type ReactNode } from "react";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  MoreIcon,
  PageBreakIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/editor/Icons";
import { PortalMenu } from "@/components/editor/PortalMenu";
import { newId } from "@/lib/resume/defaults";
import {
  addCustomField,
  addSection,
  addItemAfter,
  moveItem,
  moveSection,
  removeCustomField,
  removeItem,
  removeSection,
  setPhoto,
  toggleCustomFieldHidden,
  toggleFieldHidden,
  toggleItemHidden,
  toggleSectionHidden,
  toggleSectionPageBreak,
  type FieldTarget,
  type Mutation,
} from "@/lib/resume/mutations";
import { ADDABLE_SECTIONS, SECTION_SCHEMAS, type FieldDef } from "@/lib/resume/schemas";
import type { FieldSet, Item, Section, SectionType } from "@/lib/resume/types";

import type { Edit } from "@/components/editor/FieldEditors";

import { EditContext, editKey } from "../Editable";

/** The page-first editor's tools. Null everywhere else (form versions, the PDF, the measuring copy). */
export function useVisual() {
  return useContext(EditContext)?.visual ?? null;
}

const btn =
  "inline-flex h-6 w-6 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent";

function Act({ label, onClick, disabled, children, active }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${btn} ${active ? "bg-slate-100 text-brand" : ""}`}
    >
      {children}
    </button>
  );
}

/** The little bar that appears when hovering a block. */
function Bar({ children, style }: { children: ReactNode; style: React.CSSProperties }) {
  return (
    <div className="rb-act" style={style}>
      {children}
    </div>
  );
}

/**
 * Scrolls to a section that was just added and flashes it, so it is obvious where it landed.
 * The page re-measures after an edit, so wait a few frames for the section to exist.
 */
export function revealSection(id: string): void {
  let tries = 0;
  const look = () => {
    const el = document.querySelector<HTMLElement>(`[data-section-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.remove("rb-flash");
      void el.offsetWidth; // restart the animation if it was already running
      el.classList.add("rb-flash");
      window.setTimeout(() => el.classList.remove("rb-flash"), 2200);
    } else if (tries++ < 20) {
      requestAnimationFrame(look);
    }
  };
  requestAnimationFrame(look);
}

/**
 * Pick a section type to add at the end of its column. `types` limits the list to what belongs in
 * that column, so the section always lands where the user clicked.
 */
export function AddSectionMenu({
  edit,
  types = ADDABLE_SECTIONS,
  columnFor,
  title = "Add section",
  trigger = <PlusIcon />,
  triggerClassName = btn,
}: {
  edit: Edit;
  types?: readonly SectionType[];
  /** The column to remember for a new section of this type, if any (sidebar templates). */
  columnFor?: (type: SectionType) => "main" | "side" | undefined;
  title?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
}) {
  return (
    <PortalMenu label={title} trigger={trigger} triggerClassName={triggerClassName} width={220}>
      {(close) => (
        <ul>
          <li className="px-2 pb-1 text-xs font-medium text-slate-500">{title}</li>
          {types.map((type) => (
            <li key={type}>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100"
                onClick={() => {
                  const id = newId();
                  edit(addSection(type, id, columnFor?.(type)));
                  close();
                  revealSection(id);
                }}
              >
                {SECTION_SCHEMAS[type].label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </PortalMenu>
  );
}

/** Height of the placeholder. The measuring copy draws the same box, so page splitting matches. */
const ADD_SECTION_HEIGHT = 36;

/**
 * The "+ Add section" placeholder: always the last thing on the page while placeholders are on.
 * In the measuring copy and previews (no editor tools) it is a plain box of the same size.
 */
export function AddSectionPlaceholder({
  color,
  gap,
  types,
  columnFor,
  label = "+ Add section",
}: {
  color: string;
  gap: number;
  types: readonly SectionType[];
  columnFor?: (type: SectionType) => "main" | "side" | undefined;
  label?: string;
}) {
  const v = useVisual();
  const box: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: ADD_SECTION_HEIGHT,
    marginTop: gap,
    border: `2px dashed ${color}`,
    borderRadius: 8,
    color,
    fontSize: "0.95em",
    fontWeight: 600,
    fontFamily: "inherit",
    background: "rgba(255,255,255,.12)",
  };
  if (!v) return <div style={box}>{label}</div>;
  return (
    <AddSectionMenu
      edit={v.edit}
      types={types}
      columnFor={columnFor}
      title={label.replace("+ ", "")}
      trigger={<span style={box}>{label}</span>}
      triggerClassName="block w-full"
    />
  );
}

export function SectionActions({
  section,
  prevId,
  nextId,
  canBreak = true,
}: {
  section: Section;
  prevId?: string;
  nextId?: string;
  /** Page breaks only apply to the main column, so the button is left out for the sidebar. */
  canBreak?: boolean;
}) {
  const v = useVisual();
  if (!v) return null;
  const { edit } = v;
  return (
    <Bar style={{ top: -16, right: 0 }}>
      <Act label="Move section up" disabled={!prevId} onClick={() => edit(moveSection(section.id, prevId!))}>
        <ArrowUpIcon />
      </Act>
      <Act label="Move section down" disabled={!nextId} onClick={() => edit(moveSection(section.id, nextId!))}>
        <ArrowDownIcon />
      </Act>
      {canBreak && (
        <Act
          label={section.pageBreakBefore ? "Remove page break before this section" : "Start this section on a new page"}
          active={!!section.pageBreakBefore}
          onClick={() => edit(toggleSectionPageBreak(section.id))}
        >
          <PageBreakIcon />
        </Act>
      )}
      <Act label="Hide section" onClick={() => edit(toggleSectionHidden(section.id))}>
        <EyeIcon />
      </Act>
      <Act label="Delete section" onClick={() => edit(removeSection(section.id))}>
        <TrashIcon />
      </Act>
    </Bar>
  );
}

/** Show or hide each field of an entry (or of the header), and add your own. */
export function FieldsMenu({ target, fs, fields }: { target: FieldTarget; fs: FieldSet; fields: FieldDef[] }) {
  const v = useVisual();
  if (!v) return null;
  const { edit } = v;
  return (
    <PortalMenu label="Fields" trigger={<MoreIcon />} triggerClassName={btn} width={250}>
      {() => (
        <div>
          <p className="px-1 pb-1 text-xs font-medium text-slate-500">Show on CV</p>
          <ul>
            {fields.map((f) => (
              <li key={f.key}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                  <input type="checkbox" checked={!fs.hiddenFields[f.key]} onChange={() => edit(toggleFieldHidden(target, f.key))} />
                  {f.label}
                </label>
              </li>
            ))}
            {fs.custom.map((c) => (
              <li key={c.id} className="flex items-center gap-1 rounded px-1 py-1 hover:bg-slate-50">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={!c.hidden} onChange={() => edit(toggleCustomFieldHidden(target, c.id))} />
                  <span className="truncate">{c.value || "Your detail"}</span>
                </label>
                <button type="button" aria-label="Remove field" className={btn} onClick={() => edit(removeCustomField(target, c.id))}>
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => edit(addCustomField(target))} className="mt-2 w-full rounded px-1 py-1.5 text-left text-brand hover:bg-slate-50">
            + Add your own detail
          </button>
        </div>
      )}
    </PortalMenu>
  );
}

export function ItemActions({
  section,
  item,
  prevId,
  nextId,
  variant,
}: {
  section: Section;
  item: Item;
  prevId?: string;
  nextId?: string;
  variant: "entry" | "row";
}) {
  const v = useVisual();
  if (!v) return null;
  const { edit } = v;
  const schema = SECTION_SCHEMAS[section.type];
  if (schema.singleItem) return null;
  const style = variant === "row" ? { top: "50%", right: 0, transform: "translateY(-50%)" } : { top: -16, right: 0 };
  return (
    <Bar style={style}>
      <Act label="Move entry up" disabled={!prevId} onClick={() => edit(moveItem(section.id, item.id, prevId!))}>
        <ArrowUpIcon />
      </Act>
      <Act label="Move entry down" disabled={!nextId} onClick={() => edit(moveItem(section.id, item.id, nextId!))}>
        <ArrowDownIcon />
      </Act>
      <Act label="Add entry below" onClick={() => edit(addItemAfter(section.id, item.id))}>
        <PlusIcon />
      </Act>
      <FieldsMenu target={{ kind: "item", sectionId: section.id, itemId: item.id }} fs={item} fields={schema.fields} />
      <Act label="Hide entry" onClick={() => edit(toggleItemHidden(section.id, item.id))}>
        <EyeIcon />
      </Act>
      <Act label="Delete entry" onClick={() => edit(removeItem(section.id, item.id))}>
        <TrashIcon />
      </Act>
    </Bar>
  );
}

/** Header (name and contact details) tools: choose which details show, and add your own. */
export function HeaderActions({ fs, fields, inside }: { fs: FieldSet; fields: FieldDef[]; inside?: boolean }) {
  const v = useVisual();
  if (!v) return null;
  return (
    <Bar style={inside ? { top: 8, right: 8 } : { top: -16, right: 0 }}>
      <FieldsMenu target={{ kind: "basics" }} fs={fs} fields={fields} />
    </Bar>
  );
}

/** Stands in for a hidden section or entry so it can be brought back. Not exported. */
export function HiddenRow({ label, show }: { label: string; show: Mutation }) {
  const v = useVisual();
  return (
    <div className="rb-ph" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85em", padding: "2px 0" }}>
      <EyeOffIcon />
      <span>{label} (hidden)</span>
      {v && (
        <button type="button" onClick={() => v.edit(show)} className="font-medium text-brand underline">
          Show
        </button>
      )}
    </div>
  );
}

/** The photo spot: a dashed placeholder to add one, or the photo with change and remove. */
export function PhotoSlot({ photo, size, round }: { photo: string | null; size: number; round: boolean }) {
  const v = useVisual();
  const radius = round ? "50%" : 6;
  if (!photo) {
    const empty = (
      <div
        style={{ width: size, height: size, borderRadius: radius, border: "2px dashed #9ca3af", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontSize: "0.8em", gap: 2, background: "rgba(255,255,255,.6)" }}
      >
        <PlusIcon />
        Photo
      </div>
    );
    if (!v) return empty;
    return (
      <button type="button" aria-label="Add photo" onClick={v.pickPhoto} style={{ borderRadius: radius, display: "block" }}>
        {empty}
      </button>
    );
  }
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "cover", borderRadius: radius, display: "block" }} />
  );
  if (!v) return img;
  return (
    <div className="rb-hov" style={{ position: "relative", width: size, height: size }}>
      <button type="button" aria-label="Change photo" onClick={v.pickPhoto} style={{ display: "block", borderRadius: radius }}>
        {img}
      </button>
      <div className="rb-act" style={{ top: -8, right: -8 }}>
        <Act label="Remove photo" onClick={() => v.edit(setPhoto(null))}>
          <TrashIcon />
        </Act>
      </div>
    </div>
  );
}

/**
 * "+ Add field" under the contact details: one click adds a field of your own and puts the cursor in
 * its name. Always visible while placeholders are on. A plain box of the same size elsewhere.
 */
export function AddFieldPlaceholder({ align }: { align: "start" | "center" }) {
  const api = useContext(EditContext);
  const pill: React.CSSProperties = {
    display: "inline-block",
    margin: 0,
    padding: "1px 12px",
    border: "1px dashed currentColor",
    borderRadius: 999,
    fontSize: "0.85em",
    lineHeight: 1.4,
    fontFamily: "inherit",
    opacity: 0.75,
    background: "transparent",
    color: "inherit",
  };
  const wrap: React.CSSProperties = { display: "flex", justifyContent: align === "center" ? "center" : "flex-start", marginTop: 6 };
  const visual = api?.visual;
  if (!api || !visual) {
    return (
      <div style={wrap}>
        <span style={pill}>+ Add field</span>
      </div>
    );
  }
  return (
    <div style={wrap}>
      <button
        type="button"
        aria-label="Add field"
        style={{ ...pill, cursor: "pointer" }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const id = newId();
          visual.edit(addCustomField({ kind: "basics" }, id));
          api.requestFocus({ key: editKey({ kind: "basicsCustom", id }), caret: "start" });
        }}
      >
        + Add field
      </button>
    </div>
  );
}
