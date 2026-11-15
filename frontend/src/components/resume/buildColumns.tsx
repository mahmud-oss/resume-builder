import { Fragment, type CSSProperties, type ReactNode } from "react";

import { fontFamily, mix, spacingFactor } from "@/lib/resume/design";
import { BASICS_FIELDS, SECTION_SCHEMAS, type SectionSchema } from "@/lib/resume/schemas";
import { columnOf, columnToStore, sectionTypesFor, type TemplateConfig } from "@/lib/resume/templates";
import type { EditRef, FieldSet, Item, ResumeDoc, Section, StyleTarget } from "@/lib/resume/types";

import { Lines, Txt, editKey } from "./Editable";
import { DEFAULT_CONTACT_ICON } from "@/lib/resume/icons";
import { setCustomIcon, setFieldIcon, toggleItemHidden, toggleSectionHidden } from "@/lib/resume/mutations";
import { ContactIcon } from "./ContactIcon";
import { AddFieldPlaceholder, AddSectionPlaceholder, HeaderActions, HiddenRow, ItemActions, PhotoSlot, SectionActions } from "./visual/Actions";

/**
 * Turns a resume plus a template into blocks that can be measured and placed on pages.
 * One function draws every template; templates differ only by their configuration.
 *
 * What is drawn is exactly what is exported: hidden and empty things are left out. The one
 * exception is the field being edited, which stays visible so it does not vanish mid-edit.
 */

export type Block = {
  key: string;
  node: ReactNode;
  /** Start a new page before this block (manual page break). */
  breakBefore?: boolean;
};

export type Columns = { main: Block[]; side: Block[] };


type Ctx = {
  doc: ResumeDoc;
  template: TemplateConfig;
  accent: string;
  /** Main text colour, and a softer version of it for secondary text. */
  ink: string;
  muted: string;
  /** Base spacing unit in pixels. */
  u: number;
  focusedKey: string | null;
  /** Page-first editor: show greyed placeholders for empty things. */
  ghost: boolean;
  variant: "main" | "side";
  /** Text colour on the sidebar background. */
  fg: string;
};

/** White or dark text, whichever reads better on the given colour. */
export function onAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "#111827" : "#ffffff";
}

/**
 * The look the user chose for one part of the CV (bold, italic, underline, capitals, colour).
 * In the sidebar the colour is left alone because it sits on the accent background.
 */
function textStyle(c: Ctx, target: StyleTarget, fallbackColor?: string, em = 1): CSSProperties {
  const s = c.doc.design.styles[target];
  const css: CSSProperties = {
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration: s.underline ? "underline" : "none",
    textTransform: s.uppercase ? "uppercase" : "none",
  };
  if (s.font) css.fontFamily = fontFamily(s.font);
  const size = em * s.scale;
  if (size !== 1) css.fontSize = `${size}em`;
  if (c.variant === "main") {
    const color = s.color ?? fallbackColor;
    if (color) css.color = color;
  }
  return css;
}

function present(c: Ctx, ref: EditRef, value: string): boolean {
  return c.ghost || value.trim() !== "" || c.focusedKey === editKey(ref);
}

/** The hint shown for an empty field, only while placeholders are on. */
function ph(c: Ctx, text: string): string | undefined {
  return c.ghost ? text : undefined;
}

const BASICS_LABEL = Object.fromEntries(BASICS_FIELDS.map((f) => [f.key, f.label]));

function join(parts: ReactNode[], separator: ReactNode): ReactNode {
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && separator}
      {p}
    </Fragment>
  ));
}

// --- header ------------------------------------------------------------------------------

const CONTACT_KEYS = ["email", "phone", "location", "website", "linkedin"];

function customFieldNode(
  c: Ctx,
  fs: FieldSet,
  kind: "basics" | "item",
  scope: { sectionId?: string; itemId?: string },
  target: StyleTarget,
  iconColor: string,
) {
  const style = textStyle(c, target);
  const nodes: ReactNode[] = [];
  for (const f of fs.custom) {
    if (f.hidden) continue;
    const ref: EditRef =
      kind === "basics"
        ? { kind: "basicsCustom", id: f.id }
        : { kind: "itemCustom", sectionId: scope.sectionId!, itemId: scope.itemId!, id: f.id };
    if (!present(c, ref, f.value)) continue;
    const icon =
      kind === "basics" && c.doc.design.contactIcons ? (
        <ContactIcon
          id={f.icon ?? null}
          color={iconColor}
          choose={(choice) => setCustomIcon({ kind: "basics" }, f.id, choice === "none" || choice === null ? null : choice)}
        />
      ) : null;
    const text = <Txt edit={ref} value={f.value} style={style} placeholder={ph(c, kind === "basics" ? "Your detail" : "Extra detail")} />;
    nodes.push(
      icon ? (
        <span key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          {icon}
          {text}
        </span>
      ) : (
        <span key={f.id}>{text}</span>
      ),
    );
  }
  return nodes;
}

/** Icons are drawn in the accent colour on the page, and in the surrounding text colour on a coloured background. */
function contactParts(c: Ctx, iconColor = c.variant === "main" ? c.accent : "currentColor"): ReactNode[] {
  const b = c.doc.data.basics;
  const showIcons = c.doc.design.contactIcons;
  const parts: ReactNode[] = [];
  for (const key of CONTACT_KEYS) {
    if (b.hiddenFields[key]) continue;
    const ref: EditRef = { kind: "basics", field: key };
    const value = b.values[key] ?? "";
    if (!present(c, ref, value)) continue;
    const text = <Txt key={key} edit={ref} value={value} style={textStyle(c, "contact")} placeholder={ph(c, BASICS_LABEL[key])} />;
    if (!showIcons) {
      parts.push(text);
      continue;
    }
    const choice = b.icons?.[key];
    const id = choice === "none" ? null : (choice ?? DEFAULT_CONTACT_ICON[key] ?? null);
    parts.push(
      <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <ContactIcon id={id} color={iconColor} choose={(next) => setFieldIcon(key, next)} defaultId={DEFAULT_CONTACT_ICON[key]} />
        {text}
      </span>,
    );
  }
  return [...parts, ...customFieldNode(c, b, "basics", {}, "contact", iconColor)];
}

/** True when the template should draw a photo spot: there is a photo, or placeholders show an empty slot. */
function hasPhotoSlot(c: Ctx): boolean {
  return !!c.doc.data.basics.photo || c.ghost;
}

function photoNode(c: Ctx, size: number, round: boolean): ReactNode {
  if (!hasPhotoSlot(c)) return null;
  return <PhotoSlot photo={c.doc.data.basics.photo} size={size} round={round} />;
}

function nameAndHeadline(c: Ctx, nameColor?: string, headlineColor?: string): ReactNode {
  const b = c.doc.data.basics;
  const nameRef: EditRef = { kind: "basics", field: "fullName" };
  const headRef: EditRef = { kind: "basics", field: "headline" };
  const name = b.values.fullName ?? "";
  const headline = b.values.headline ?? "";
  return (
    <>
      {!b.hiddenFields.fullName && present(c, nameRef, name) && (
        <div style={{ lineHeight: 1.15, ...textStyle(c, "name", nameColor ?? c.ink, 2.1) }}>
          <Txt edit={nameRef} value={name} placeholder={ph(c, "Your name")} />
        </div>
      )}
      {!b.hiddenFields.headline && present(c, headRef, headline) && (
        <div style={{ marginTop: c.u * 0.3, ...textStyle(c, "headline", headlineColor ?? c.accent, 1.15) }}>
          <Txt edit={headRef} value={headline} placeholder={ph(c, "Professional title")} />
        </div>
      )}
    </>
  );
}

function hasHeader(c: Ctx): boolean {
  const b = c.doc.data.basics;
  const name = !b.hiddenFields.fullName && present(c, { kind: "basics", field: "fullName" }, b.values.fullName ?? "");
  const head = !b.hiddenFields.headline && present(c, { kind: "basics", field: "headline" }, b.values.headline ?? "");
  return name || head || contactParts(c).length > 0 || hasPhotoSlot(c);
}

function headerBlock(c: Ctx): Block | null {
  if (!hasHeader(c)) return null;
  const { header } = c.template;
  const contact = contactParts(c, header === "banner" ? "currentColor" : undefined);
  // With icons on, the icons mark each detail, so a plain gap replaces the dot.
  const sep = c.doc.design.contactIcons ? (
    <span style={{ padding: "0 0.7em" }} />
  ) : (
    <span style={{ padding: "0 0.45em", opacity: 0.6 }}>·</span>
  );
  const pad = c.u * 1.6;

  const withActions = (node: ReactNode, inside = false): ReactNode => (
    <div className="rb-hov">
      {node}
      <HeaderActions fs={c.doc.data.basics} fields={BASICS_FIELDS} inside={inside} />
    </div>
  );

  if (header === "banner") {
    const fg = onAccent(c.accent);
    return {
      key: "header",
      node: withActions(
        <div
          style={{
            background: c.accent,
            color: fg,
            margin: `0 -${c.template.margin.side}px`,
            padding: `${c.u * 5}px ${c.template.margin.side}px ${c.u * 3}px`,
            marginBottom: pad,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div>
            {nameAndHeadline(c, fg, fg)}
            {contact.length > 0 && <div style={{ marginTop: c.u, fontSize: "0.95em" }}>{join(contact, sep)}</div>}
            {c.ghost && <AddFieldPlaceholder align="start" />}
          </div>
          {photoNode(c, 96, true)}
        </div>,
        true,
      ),
    };
  }

  if (header === "center") {
    return {
      key: "header",
      node: withActions(
        <div style={{ textAlign: "center", paddingBottom: pad }}>
          {hasPhotoSlot(c) && <div style={{ display: "flex", justifyContent: "center", marginBottom: c.u }}>{photoNode(c, 88, true)}</div>}
          {nameAndHeadline(c)}
          {contact.length > 0 && (
            <div style={{ marginTop: c.u * 0.8, fontSize: "0.95em", color: c.muted }}>{join(contact, sep)}</div>
          )}
          {c.ghost && (
            <div style={{ color: c.muted }}>
              <AddFieldPlaceholder align="center" />
            </div>
          )}
        </div>,
      ),
    };
  }

  return {
    key: "header",
    node: withActions(
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, paddingBottom: pad }}>
        <div>
          {nameAndHeadline(c)}
          {contact.length > 0 && (
            <div style={{ marginTop: c.u * 0.8, fontSize: "0.95em", color: c.muted }}>{join(contact, sep)}</div>
          )}
          {c.ghost && (
            <div style={{ color: c.muted }}>
              <AddFieldPlaceholder align="start" />
            </div>
          )}
        </div>
        {photoNode(c, 84, false)}
      </div>,
    ),
  };
}

/** Sidebar layout: the name goes in the main column. */
function nameBlock(c: Ctx): Block | null {
  const b = c.doc.data.basics;
  const has =
    (!b.hiddenFields.fullName && present(c, { kind: "basics", field: "fullName" }, b.values.fullName ?? "")) ||
    (!b.hiddenFields.headline && present(c, { kind: "basics", field: "headline" }, b.values.headline ?? ""));
  if (!has) return null;
  return { key: "header", node: <div style={{ paddingBottom: c.u * 2 }}>{nameAndHeadline(c)}</div> };
}

/** Sidebar layout: photo and contact details, stacked, at the top of the sidebar. */
function sidebarContactBlock(c: Ctx): Block | null {
  const contact = contactParts(c);
  if (contact.length === 0 && !hasPhotoSlot(c)) return null;
  return {
    key: "contact",
    node: (
      <div className="rb-hov" style={{ paddingBottom: c.u * 2 }}>
        <HeaderActions fs={c.doc.data.basics} fields={BASICS_FIELDS} />
        {hasPhotoSlot(c) && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: c.u * 1.5 }}>{photoNode(c, 112, true)}</div>
        )}
        {contact.length > 0 && (
          <div style={{ fontSize: "0.92em" }}>
            {contact.map((p, i) => (
              <div key={i} style={{ marginBottom: c.u * 0.5, overflowWrap: "anywhere" }}>
                {p}
              </div>
            ))}
          </div>
        )}
        {c.ghost && (
          <div style={{ fontSize: "0.92em" }}>
            <AddFieldPlaceholder align="start" />
          </div>
        )}
      </div>
    ),
  };
}

// --- sections ----------------------------------------------------------------------------

function SectionHeading({ c, section }: { c: Ctx; section: Section }) {
  const ref: EditRef = { kind: "sectionTitle", sectionId: section.id };
  const bottom = c.u * 0.8;
  let style: CSSProperties;

  if (c.variant === "side") {
    style = {
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: "0.85em",
      fontWeight: 700,
      borderBottom: `1px solid ${c.fg}66`,
      paddingBottom: 3,
      marginBottom: bottom,
    };
  } else {
    const em = c.template.heading === "rule" ? 0.95 : c.template.heading === "caps" ? 0.9 : 1.05;
    const base: CSSProperties = { ...textStyle(c, "heading", c.accent, em), marginBottom: bottom };
    const caps = c.doc.design.styles.heading.uppercase;
    switch (c.template.heading) {
      case "rule":
        style = { ...base, letterSpacing: caps ? "0.08em" : undefined, borderBottom: `1.5px solid ${c.accent}`, paddingBottom: 3 };
        break;
      case "caps":
        style = { ...base, letterSpacing: caps ? "0.14em" : undefined };
        break;
      case "bar":
        style = { ...base, letterSpacing: caps ? "0.06em" : undefined, borderLeft: `4px solid ${c.accent}`, paddingLeft: 8 };
        break;
      default:
        style = { ...base, letterSpacing: caps ? "0.06em" : undefined, marginBottom: c.u * 0.6 };
    }
  }

  return (
    <div style={style}>
      <Txt edit={ref} value={section.title} />
    </div>
  );
}

function hasVisibleContent(schema: SectionSchema, item: Item): boolean {
  const fields = schema.fields.some((f) => !item.hiddenFields[f.key] && (item.values[f.key] ?? "").trim() !== "");
  return fields || item.custom.some((f) => !f.hidden && f.value.trim() !== "");
}

function EntryItem({ c, section, schema, item }: { c: Ctx; section: Section; schema: SectionSchema; item: Item }) {
  const ref = (field: string): EditRef => ({ kind: "item", sectionId: section.id, itemId: item.id, field });
  const value = (field?: string) => (field ? (item.values[field] ?? "") : "");
  const shown = (field?: string) => !!field && !item.hiddenFields[field] && present(c, ref(field), value(field));

  const used = new Set<string>(
    [schema.title, schema.dateStart, schema.dateEnd, schema.body, ...(schema.subtitle ?? [])].filter(Boolean) as string[],
  );
  const subtitle = (schema.subtitle ?? []).filter(shown);
  const extras = schema.fields.map((f) => f.key).filter((k) => !used.has(k) && shown(k));
  const dates = [schema.dateStart, schema.dateEnd].filter(shown) as string[];
  const bodyField = schema.fields.find((f) => f.key === schema.body);
  const custom = customFieldNode(c, item, "item", { sectionId: section.id, itemId: item.id }, "subtitle", "currentColor");
  const small: CSSProperties = { color: c.muted, fontSize: "0.95em" };
  const hint = (field: string) => ph(c, schema.fields.find((f) => f.key === field)?.label ?? field);

  return (
    <div>
      {(shown(schema.title) || dates.length > 0) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: c.variant === "side" ? "wrap" : undefined }}>
          <div style={textStyle(c, "itemTitle", c.ink)}>{shown(schema.title) && <Txt edit={ref(schema.title!)} value={value(schema.title)} placeholder={hint(schema.title!)} />}</div>
          {dates.length > 0 && (
            <div style={{ ...small, whiteSpace: c.variant === "side" ? "normal" : "nowrap", overflowWrap: "anywhere" }}>
              {join(
                dates.map((d) => <Txt key={d} edit={ref(d)} value={value(d)} style={textStyle(c, "dates")} placeholder={hint(d)} />),
                " – ",
              )}
            </div>
          )}
        </div>
      )}
      {subtitle.length > 0 && (
        <div style={small}>
          {join(
            subtitle.map((s) => (
              <Txt
                key={s}
                edit={ref(s)}
                value={value(s)}
                style={textStyle(c, s === "location" ? "location" : "subtitle", c.muted)}
                placeholder={hint(s)}
              />
            )),
            " · ",
          )}
        </div>
      )}
      {extras.length > 0 && (
        <div style={small}>
          {join(
            extras.map((e) => <Txt key={e} edit={ref(e)} value={value(e)} style={textStyle(c, "subtitle", c.muted)} placeholder={hint(e)} />),
            " · ",
          )}
        </div>
      )}
      {shown(schema.body) &&
        (bodyField?.kind === "bullets" ? (
          <Lines
            edit={ref(schema.body!)}
            value={value(schema.body)}
            focusedKey={c.focusedKey}
            ghostPlaceholder={ph(c, bodyField.placeholder ?? bodyField.label)}
            style={{ marginTop: c.u * 0.4, ...textStyle(c, "bullets") }}
          />
        ) : (
          <div style={{ marginTop: c.u * 0.4, ...textStyle(c, "bullets") }}>
            <Txt edit={ref(schema.body!)} value={value(schema.body)} multiline placeholder={hint(schema.body!)} />
          </div>
        ))}
      {custom.length > 0 && (
        <div style={{ ...small, marginTop: c.u * 0.3 }}>
          {custom.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function RowItem({ c, section, schema, item }: { c: Ctx; section: Section; schema: SectionSchema; item: Item }) {
  const ref = (field: string): EditRef => ({ kind: "item", sectionId: section.id, itemId: item.id, field });
  const labelKey = schema.rowLabel!;
  const valueKey = schema.rowValue!;
  const showLabel = !item.hiddenFields[labelKey] && present(c, ref(labelKey), item.values[labelKey] ?? "");
  const showValue = !item.hiddenFields[valueKey] && present(c, ref(valueKey), item.values[valueKey] ?? "");
  if (!showLabel && !showValue) return null;

  const fieldLabel = (key: string) => schema.fields.find((f) => f.key === key)?.label ?? key;
  const label = showLabel && (
    <Txt edit={ref(labelKey)} value={item.values[labelKey] ?? ""} style={textStyle(c, "skillLabel")} placeholder={ph(c, fieldLabel(labelKey))} />
  );
  const value = showValue && (
    <Txt edit={ref(valueKey)} value={item.values[valueKey] ?? ""} style={textStyle(c, "skillValue")} placeholder={ph(c, fieldLabel(valueKey))} />
  );

  if (c.variant === "side") {
    return (
      <div style={{ marginBottom: c.u * 0.6, fontSize: "0.95em", overflowWrap: "anywhere" }}>
        {label && <div>{label}</div>}
        {value && <div style={{ opacity: 0.9 }}>{value}</div>}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: c.u * 0.3 }}>
      {label}
      {showLabel && showValue && ": "}
      {value}
    </div>
  );
}

type Neighbours = { prevId?: string; nextId?: string };

function sectionBlocks(c: Ctx, section: Section, nav: Neighbours): Block[] {
  if (section.hidden) {
    // Placeholders on: leave a small row so the section can be brought back.
    return c.ghost ? [{ key: section.id, node: <HiddenRow label={section.title} show={toggleSectionHidden(section.id)} /> }] : [];
  }
  const schema = SECTION_SCHEMAS[section.type];
  const items = c.ghost
    ? section.items
    : section.items.filter((i) => !i.hidden && (hasVisibleContent(schema, i) || (c.focusedKey?.includes(i.id) ?? false)));
  if (items.length === 0) return [];

  const heading = (
    <div className="rb-hov" data-section-id={section.id}>
      <SectionHeading c={c} section={section} />
      <SectionActions section={section} prevId={nav.prevId} nextId={nav.nextId} canBreak={c.variant === "main"} />
    </div>
  );
  const gap = c.u * 1.1;
  const sectionEnd = c.u * 2;
  const breakBefore = c.variant === "main" && !!section.pageBreakBefore;
  const around = (i: number): Neighbours => ({ prevId: items[i - 1]?.id, nextId: items[i + 1]?.id });

  if (schema.layout === "entry") {
    return items.map((item, index) => ({
      key: item.id,
      breakBefore: index === 0 ? breakBefore : undefined,
      node: (
        <div style={{ paddingBottom: index === items.length - 1 ? sectionEnd : gap }}>
          {index === 0 && heading}
          {item.hidden ? (
            <HiddenRow label="Entry" show={toggleItemHidden(section.id, item.id)} />
          ) : (
            <div className="rb-hov">
              <EntryItem c={c} section={section} schema={schema} item={item} />
              <ItemActions section={section} item={item} variant="entry" {...around(index)} />
            </div>
          )}
        </div>
      ),
    }));
  }

  const body =
    schema.layout === "text" ? (
      <div style={textStyle(c, "summary")}>
        <Txt
          edit={{ kind: "item", sectionId: section.id, itemId: items[0].id, field: schema.body! }}
          value={items[0].values[schema.body!] ?? ""}
          multiline
          placeholder={ph(c, schema.fields.find((f) => f.key === schema.body)?.placeholder ?? "Write here")}
        />
      </div>
    ) : (
      items.map((item, index) =>
        item.hidden ? (
          <HiddenRow key={item.id} label="Entry" show={toggleItemHidden(section.id, item.id)} />
        ) : (
          <div key={item.id} className="rb-hov">
            <RowItem c={c} section={section} schema={schema} item={item} />
            <ItemActions section={section} item={item} variant="row" {...around(index)} />
          </div>
        )
      )
    );

  return [
    {
      key: section.id,
      breakBefore,
      node: (
        <div style={{ paddingBottom: sectionEnd }}>
          {heading}
          {body}
        </div>
      ),
    },
  ];
}

// --- public ------------------------------------------------------------------------------

export function buildColumns(
  doc: ResumeDoc,
  template: TemplateConfig,
  focusedKey: string | null,
  ghost = false,
): Columns {
  const accent = doc.design.accent;
  const u = 8 * spacingFactor(doc.design.spacing);
  const ink = doc.design.textColor;
  const base = { doc, template, accent, ink, muted: mix(ink, "#ffffff", 0.3), u, focusedKey, ghost };
  const mainCtx: Ctx = { ...base, variant: "main", fg: ink };
  const sideFg = onAccent(accent);
  const sideCtx: Ctx = { ...base, variant: "side", fg: sideFg, ink: sideFg, muted: sideFg };

  const main: Block[] = [];
  const side: Block[] = [];

  if (template.layout === "sidebar") {
    const contact = sidebarContactBlock(sideCtx);
    if (contact) side.push(contact);
    const name = nameBlock(mainCtx);
    if (name) main.push(name);
    for (const section of doc.data.sections) {
      const toSide = columnOf(template, section) === "side";
      // Moving a section swaps it with its neighbour in the same column, so the move is always visible.
      const column = doc.data.sections.filter((s) => (columnOf(template, s) === "side") === toSide);
      const at = column.findIndex((s) => s.id === section.id);
      const nav = { prevId: column[at - 1]?.id, nextId: column[at + 1]?.id };
      (toSide ? side : main).push(...sectionBlocks(toSide ? sideCtx : mainCtx, section, nav));
    }
  } else {
    const header = headerBlock(mainCtx);
    if (header) main.push(header);
    const all = doc.data.sections;
    all.forEach((section, i) => main.push(...sectionBlocks(mainCtx, section, { prevId: all[i - 1]?.id, nextId: all[i + 1]?.id })));
  }

  // Placeholders on: an always-visible "+ Add section" closes the page, after every existing section.
  // One placeholder per column on a sidebar template, each listing only what belongs there, so a new
  // section always lands where the user clicked.
  if (ghost) {
    const sidebar = template.layout === "sidebar";
    main.push({
      key: "add-section",
      node: (
        <AddSectionPlaceholder
          color={accent}
          gap={u}
          types={sectionTypesFor(template, "main")}
          columnFor={(type) => columnToStore(template, type, "main")}
          label={sidebar ? "+ Add to main column" : "+ Add section"}
        />
      ),
    });
    if (sidebar) {
      side.push({
        key: "add-section-side",
        node: (
          <AddSectionPlaceholder
            color={sideFg}
            gap={u}
            types={sectionTypesFor(template, "side")}
            columnFor={(type) => columnToStore(template, type, "side")}
            label="+ Add to sidebar"
          />
        ),
      });
    }
  }

  return { main, side };
}
