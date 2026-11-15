import { Fragment, type CSSProperties, type ReactNode } from "react";

import { spacingFactor } from "@/lib/resume/design";
import { SECTION_SCHEMAS, type SectionSchema } from "@/lib/resume/schemas";
import type { TemplateConfig } from "@/lib/resume/templates";
import type { EditRef, FieldSet, Item, ResumeDoc, Section } from "@/lib/resume/types";

import { Lines, Txt, editKey } from "./Editable";

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

const INK = "#1f2937";
const MUTED = "#4b5563";

type Ctx = {
  doc: ResumeDoc;
  template: TemplateConfig;
  accent: string;
  /** Base spacing unit in pixels. */
  u: number;
  focusedKey: string | null;
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

function present(c: Ctx, ref: EditRef, value: string): boolean {
  return value.trim() !== "" || c.focusedKey === editKey(ref);
}

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

function customFieldNode(c: Ctx, fs: FieldSet, kind: "basics" | "item", scope: { sectionId?: string; itemId?: string }) {
  const nodes: ReactNode[] = [];
  for (const f of fs.custom) {
    if (f.hidden) continue;
    const valueRef: EditRef =
      kind === "basics"
        ? { kind: "basicsCustom", id: f.id, part: "value" }
        : { kind: "itemCustom", sectionId: scope.sectionId!, itemId: scope.itemId!, id: f.id, part: "value" };
    const labelRef: EditRef = { ...valueRef, part: "label" } as EditRef;
    if (!present(c, valueRef, f.value)) continue;
    const showLabel = present(c, labelRef, f.label);
    nodes.push(
      <span key={f.id}>
        {showLabel && (
          <>
            <Txt edit={labelRef} value={f.label} />
            {": "}
          </>
        )}
        <Txt edit={valueRef} value={f.value} />
      </span>,
    );
  }
  return nodes;
}

function contactParts(c: Ctx): ReactNode[] {
  const b = c.doc.data.basics;
  const parts: ReactNode[] = [];
  for (const key of CONTACT_KEYS) {
    if (b.hiddenFields[key]) continue;
    const ref: EditRef = { kind: "basics", field: key };
    const value = b.values[key] ?? "";
    if (present(c, ref, value)) parts.push(<Txt key={key} edit={ref} value={value} />);
  }
  return [...parts, ...customFieldNode(c, b, "basics", {})];
}

function photoNode(c: Ctx, size: number, round: boolean): ReactNode {
  const photo = c.doc.data.basics.photo;
  if (!photo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "cover", borderRadius: round ? "50%" : 6, display: "block" }}
    />
  );
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
        <div style={{ fontSize: "2.1em", fontWeight: 700, lineHeight: 1.15, color: nameColor ?? INK }}>
          <Txt edit={nameRef} value={name} />
        </div>
      )}
      {!b.hiddenFields.headline && present(c, headRef, headline) && (
        <div style={{ fontSize: "1.15em", marginTop: c.u * 0.3, color: headlineColor ?? c.accent }}>
          <Txt edit={headRef} value={headline} />
        </div>
      )}
    </>
  );
}

function hasHeader(c: Ctx): boolean {
  const b = c.doc.data.basics;
  const name = !b.hiddenFields.fullName && present(c, { kind: "basics", field: "fullName" }, b.values.fullName ?? "");
  const head = !b.hiddenFields.headline && present(c, { kind: "basics", field: "headline" }, b.values.headline ?? "");
  return name || head || contactParts(c).length > 0 || !!b.photo;
}

function headerBlock(c: Ctx): Block | null {
  if (!hasHeader(c)) return null;
  const { header } = c.template;
  const contact = contactParts(c);
  const sep = <span style={{ padding: "0 0.45em", opacity: 0.6 }}>·</span>;
  const pad = c.u * 1.6;

  if (header === "banner") {
    const fg = onAccent(c.accent);
    return {
      key: "header",
      node: (
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
          </div>
          {photoNode(c, 96, true)}
        </div>
      ),
    };
  }

  if (header === "center") {
    return {
      key: "header",
      node: (
        <div style={{ textAlign: "center", paddingBottom: pad }}>
          {c.doc.data.basics.photo && <div style={{ display: "flex", justifyContent: "center", marginBottom: c.u }}>{photoNode(c, 88, true)}</div>}
          {nameAndHeadline(c)}
          {contact.length > 0 && (
            <div style={{ marginTop: c.u * 0.8, fontSize: "0.95em", color: MUTED }}>{join(contact, sep)}</div>
          )}
        </div>
      ),
    };
  }

  return {
    key: "header",
    node: (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, paddingBottom: pad }}>
        <div>
          {nameAndHeadline(c)}
          {contact.length > 0 && (
            <div style={{ marginTop: c.u * 0.8, fontSize: "0.95em", color: MUTED }}>{join(contact, sep)}</div>
          )}
        </div>
        {photoNode(c, 84, false)}
      </div>
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
  if (contact.length === 0 && !c.doc.data.basics.photo) return null;
  return {
    key: "contact",
    node: (
      <div style={{ paddingBottom: c.u * 2 }}>
        {c.doc.data.basics.photo && (
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
    const base: CSSProperties = { fontWeight: 700, color: c.accent, marginBottom: bottom };
    switch (c.template.heading) {
      case "rule":
        style = { ...base, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.95em", borderBottom: `1.5px solid ${c.accent}`, paddingBottom: 3 };
        break;
      case "caps":
        style = { ...base, textTransform: "uppercase", letterSpacing: "0.14em", fontSize: "0.9em" };
        break;
      case "bar":
        style = { ...base, fontSize: "1.05em", borderLeft: `4px solid ${c.accent}`, paddingLeft: 8 };
        break;
      default:
        style = { ...base, fontSize: "1.05em", marginBottom: c.u * 0.6 };
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
  const custom = customFieldNode(c, item, "item", { sectionId: section.id, itemId: item.id });
  const small: CSSProperties = { color: MUTED, fontSize: "0.95em" };

  return (
    <div>
      {(shown(schema.title) || dates.length > 0) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div style={{ fontWeight: 700 }}>{shown(schema.title) && <Txt edit={ref(schema.title!)} value={value(schema.title)} />}</div>
          {dates.length > 0 && (
            <div style={{ ...small, whiteSpace: "nowrap" }}>
              {join(
                dates.map((d) => <Txt key={d} edit={ref(d)} value={value(d)} />),
                " – ",
              )}
            </div>
          )}
        </div>
      )}
      {subtitle.length > 0 && (
        <div style={{ ...small, fontStyle: "italic" }}>
          {join(
            subtitle.map((s) => <Txt key={s} edit={ref(s)} value={value(s)} />),
            " · ",
          )}
        </div>
      )}
      {extras.length > 0 && (
        <div style={small}>
          {join(
            extras.map((e) => <Txt key={e} edit={ref(e)} value={value(e)} />),
            " · ",
          )}
        </div>
      )}
      {shown(schema.body) &&
        (bodyField?.kind === "bullets" ? (
          <Lines edit={ref(schema.body!)} value={value(schema.body)} focusedKey={c.focusedKey} style={{ marginTop: c.u * 0.4 }} />
        ) : (
          <div style={{ marginTop: c.u * 0.4 }}>
            <Txt edit={ref(schema.body!)} value={value(schema.body)} multiline />
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

  const label = showLabel && <Txt edit={ref(labelKey)} value={item.values[labelKey] ?? ""} style={{ fontWeight: 700 }} />;
  const value = showValue && <Txt edit={ref(valueKey)} value={item.values[valueKey] ?? ""} />;

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

function sectionBlocks(c: Ctx, section: Section): Block[] {
  if (section.hidden) return [];
  const schema = SECTION_SCHEMAS[section.type];
  const items = section.items.filter(
    (i) => !i.hidden && (hasVisibleContent(schema, i) || (c.focusedKey?.includes(i.id) ?? false)),
  );
  if (items.length === 0) return [];

  const heading = <SectionHeading c={c} section={section} />;
  const gap = c.u * 1.1;
  const sectionEnd = c.u * 2;
  const breakBefore = c.variant === "main" && !!section.pageBreakBefore;

  if (schema.layout === "entry") {
    return items.map((item, index) => ({
      key: item.id,
      breakBefore: index === 0 ? breakBefore : undefined,
      node: (
        <div style={{ paddingBottom: index === items.length - 1 ? sectionEnd : gap }}>
          {index === 0 && heading}
          <EntryItem c={c} section={section} schema={schema} item={item} />
        </div>
      ),
    }));
  }

  const body =
    schema.layout === "text" ? (
      <div>
        <Txt
          edit={{ kind: "item", sectionId: section.id, itemId: items[0].id, field: schema.body! }}
          value={items[0].values[schema.body!] ?? ""}
          multiline
        />
      </div>
    ) : (
      items.map((item) => <RowItem key={item.id} c={c} section={section} schema={schema} item={item} />)
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

export function buildColumns(doc: ResumeDoc, template: TemplateConfig, focusedKey: string | null): Columns {
  const accent = doc.design.accent;
  const u = 8 * spacingFactor(doc.design.spacing);
  const base = { doc, template, accent, u, focusedKey };
  const mainCtx: Ctx = { ...base, variant: "main", fg: INK };
  const sideCtx: Ctx = { ...base, variant: "side", fg: onAccent(accent) };

  const main: Block[] = [];
  const side: Block[] = [];

  if (template.layout === "sidebar") {
    const contact = sidebarContactBlock(sideCtx);
    if (contact) side.push(contact);
    const name = nameBlock(mainCtx);
    if (name) main.push(name);
    for (const section of doc.data.sections) {
      const toSide = template.sidebarSections?.includes(section.type) ?? false;
      (toSide ? side : main).push(...sectionBlocks(toSide ? sideCtx : mainCtx, section));
    }
  } else {
    const header = headerBlock(mainCtx);
    if (header) main.push(header);
    for (const section of doc.data.sections) main.push(...sectionBlocks(mainCtx, section));
  }

  return { main, side };
}
