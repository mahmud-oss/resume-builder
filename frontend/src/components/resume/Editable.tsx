"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import type { EditRef } from "@/lib/resume/types";

/**
 * Provided only by the live preview. Anything rendered outside it (the measuring copy, the
 * template gallery, the PDF page) shows the same text as plain, non-editable content.
 */
export type EditApi = {
  onEdit: (ref: EditRef, text: string) => void;
  focusedKey: string | null;
  setFocusedKey: (key: string | null) => void;
};

export const EditContext = createContext<EditApi | null>(null);

export function editKey(ref: EditRef, line?: number): string {
  const base = JSON.stringify(ref);
  return line === undefined ? base : `${base}#${line}`;
}

type SpanProps = {
  value: string;
  focusKey: string;
  onChange: (text: string) => void;
  multiline?: boolean;
  style?: CSSProperties;
  className?: string;
};

/**
 * A piece of text that can be edited in place. The browser owns the text while the user types
 * (so the cursor never jumps); React only writes to it when the value changed from elsewhere,
 * for example from the form or from undo.
 */
function EditableSpan({ value, focusKey, onChange, multiline, style, className }: SpanProps) {
  const api = useContext(EditContext);
  const ref = useRef<HTMLSpanElement>(null);
  const [initial] = useState(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) el.textContent = value;
  });

  const whiteSpace = multiline ? "pre-wrap" : undefined;

  if (!api) {
    return (
      <span className={className} style={{ ...style, whiteSpace }}>
        {value}
      </span>
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLSpanElement>) {
    if (!multiline && e.key === "Enter") e.preventDefault();
  }

  function onPaste(e: ClipboardEvent<HTMLSpanElement>) {
    if (multiline) return;
    // Keep single-line fields on one line.
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\s*\n+\s*/g, " ");
    document.execCommand("insertText", false, text);
  }

  return (
    <span
      ref={ref}
      className={`rb-editable ${className ?? ""}`}
      style={{ ...style, whiteSpace }}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => api.setFocusedKey(focusKey)}
      onBlur={() => api.setFocusedKey(null)}
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    >
      {initial}
    </span>
  );
}

type TxtProps = {
  edit: EditRef;
  value: string;
  multiline?: boolean;
  style?: CSSProperties;
  className?: string;
};

/** Text bound to one field of the resume data. */
export function Txt({ edit, value, multiline, style, className }: TxtProps) {
  const api = useContext(EditContext);
  return (
    <EditableSpan
      value={value}
      focusKey={editKey(edit)}
      onChange={(text) => api?.onEdit(edit, text)}
      multiline={multiline}
      style={style}
      className={className}
    />
  );
}

type LinesProps = {
  edit: EditRef;
  value: string;
  bullets?: boolean;
  focusedKey: string | null;
  style?: CSSProperties;
};

/** A field with one point per line. Each line is edited on its own. */
export function Lines({ edit, value, bullets = true, focusedKey, style }: LinesProps) {
  const api = useContext(EditContext);
  const lines = value.split("\n");

  const shown = lines
    .map((text, index) => ({ text, index }))
    .filter(({ text, index }) => text.trim() !== "" || focusedKey === editKey(edit, index));
  if (shown.length === 0) return null;

  function change(index: number, text: string) {
    const next = [...lines];
    next[index] = text.replace(/\s*\n+\s*/g, " ");
    api?.onEdit(edit, next.join("\n"));
  }

  const lineProps = (index: number, text: string) => (
    <EditableSpan value={text} focusKey={editKey(edit, index)} onChange={(t) => change(index, t)} />
  );

  if (!bullets) {
    return (
      <div style={style}>
        {shown.map(({ text, index }) => (
          <div key={index}>{lineProps(index, text)}</div>
        ))}
      </div>
    );
  }

  return (
    <ul style={{ margin: 0, paddingLeft: "1.2em", listStyle: "disc", ...style }}>
      {shown.map(({ text, index }) => (
        <li key={index} style={{ paddingLeft: 2 }}>
          {lineProps(index, text)}
        </li>
      ))}
    </ul>
  );
}
