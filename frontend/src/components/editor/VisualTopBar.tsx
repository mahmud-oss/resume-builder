"use client";

import { setDesign } from "@/lib/resume/mutations";
import type { Design } from "@/lib/resume/types";

import type { Edit } from "./FieldEditors";
import { PortalMenu } from "./PortalMenu";
import { TemplatePicker } from "./TemplatePicker";
import { ThemeCustomiser } from "./ThemeCustomiser";
import { ThemePicker } from "./ThemePicker";

const chip =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-expanded:border-brand aria-expanded:text-brand";

/** Whole-CV choices for the page-first editor. Per-text styling floats next to the text instead. */
export function VisualTopBar({
  templateId,
  design,
  edit,
  ghost,
  onGhost,
  preview,
  onPreview,
  compact,
  zoom,
  onZoom,
}: {
  templateId: string;
  design: Design;
  edit: Edit;
  ghost: boolean;
  onGhost: (on: boolean) => void;
  preview: boolean;
  onPreview: (on: boolean) => void;
  /** Phone layout: one row you can swipe sideways, plus zoom. */
  compact: boolean;
  zoom: "fit" | 0.75 | 1;
  onZoom: (zoom: "fit" | 0.75 | 1) => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Whole CV"
      className={`flex items-center gap-2 border-b border-slate-200 bg-white px-3 ${compact ? "py-1" : "py-2"} ${compact ? "overflow-x-auto whitespace-nowrap [&>*]:shrink-0" : "flex-wrap"}`}
    >
      {compact && (
        <div
          role="group"
          aria-label="Zoom"
          className="flex overflow-hidden rounded-md border border-slate-300"
        >
          {(
            [
              ["fit", "Fit"],
              [0.75, "75%"],
              [1, "100%"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={zoom === value}
              onClick={() => onZoom(value)}
              className={`min-h-9 px-3 text-sm font-medium ${zoom === value ? "bg-brand text-white" : "bg-white text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <PortalMenu
        label="Template"
        trigger="Template"
        triggerClassName={chip}
        width={400}
      >
        {() => <TemplatePicker templateId={templateId} edit={edit} />}
      </PortalMenu>
      <PortalMenu
        label="Theme"
        trigger="Theme"
        triggerClassName={chip}
        width={320}
      >
        {() => (
          <ThemePicker templateId={templateId} design={design} edit={edit} />
        )}
      </PortalMenu>
      <PortalMenu
        label="Colours and fonts"
        trigger="Colours & fonts"
        triggerClassName={chip}
        width={360}
      >
        {() => <ThemeCustomiser design={design} edit={edit} />}
      </PortalMenu>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={design.contactIcons}
          onChange={(e) => edit(setDesign({ contactIcons: e.target.checked }))}
        />
        {compact ? "Icons" : "Contact icons"}
      </label>
      <label
        className={`${compact ? "" : "ml-auto"} flex cursor-pointer items-center gap-2 text-sm text-slate-700`}
      >
        <input
          type="checkbox"
          checked={ghost}
          onChange={(e) => onGhost(e.target.checked)}
        />
        {compact ? "Placeholders" : "Show placeholders"}
      </label>
      <button
        type="button"
        aria-pressed={preview}
        onClick={() => onPreview(!preview)}
        className={`${chip} ${preview ? "border-brand text-brand" : ""}`}
      >
        {preview ? "Hide preview" : "Preview"}
      </button>
    </div>
  );
}
