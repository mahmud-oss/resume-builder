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
  type MouseEvent,
} from "react";

import type { Edit } from "@/components/editor/FieldEditors";
import { mergeLineUp, splitLineAt } from "@/lib/resume/lines";
import type { EditRef } from "@/lib/resume/types";

/** Extra things the page-first editor (version C) can do straight on the page. */
export type VisualApi = {
  edit: Edit;
  pickPhoto: () => void;
};

export type FocusRequest = { key: string; caret: "start" | "end" };

/**
 * Provided only by the live preview. Anything rendered outside it (the measuring copy, the
 * template gallery, the PDF page) shows the same text as plain, non-editable content.
 */
export type EditApi = {
  onEdit: (ref: EditRef, text: string) => void;
  focusedKey: string | null;
  setFocusedKey: (key: string | null) => void;
  /** Moves the cursor to another piece of text once it exists (for example a new bullet). */
  focusRequest: FocusRequest | null;
  requestFocus: (request: FocusRequest) => void;
  clearFocusRequest: () => void;
  visual: VisualApi | null;
};

export const EditContext = createContext<EditApi | null>(null);

export function editKey(ref: EditRef, line?: number): string {
  const base = JSON.stringify(ref);
  return line === undefined ? base : `${base}#${line}`;
}

/** Number of characters before the cursor inside `el`. */
function caretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const before = range.cloneRange();
  before.selectNodeContents(el);
  before.setEnd(range.endContainer, range.endOffset);
  return before.toString().length;
}

type SpanProps = {
  value: string;
  focusKey: string;
  onChange: (text: string) => void;
  multiline?: boolean;
  /** Greyed hint shown while the text is empty (page-first editor only). */
  placeholder?: string;
  /** Enter pressed at `offset` (bullet lines). */
  onSplit?: (offset: number) => void;
  /** Backspace pressed at the very start (bullet lines). */
  onJoin?: () => void;
  style?: CSSProperties;
  className?: string;
};

/**
 * A piece of text that can be edited in place. The browser owns the text while the user types
 * (so the cursor never jumps); React only writes to it when the value changed from elsewhere,
 * for example from the form or from undo.
 */
function EditableSpan({ value, focusKey, onChange, multiline, placeholder, onSplit, onJoin, style, className }: SpanProps) {
  const api = useContext(EditContext);
  const ref = useRef<HTMLSpanElement>(null);
  const [initial] = useState(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) el.textContent = value;
  });

  // Take the cursor when another piece of text asked for it (a new bullet, or the one before a merge).
  useLayoutEffect(() => {
    const request = api?.focusRequest;
    const el = ref.current;
    if (!api || !request || !el || request.key !== focusKey) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(request.caret === "start");
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    api.clearFocusRequest();
  });

  const whiteSpace = multiline ? "pre-wrap" : undefined;

  if (!api) {
    return (
      <span className={className} style={{ ...style, whiteSpace }}>
        {value === "" && placeholder ? <span className="rb-ph">{placeholder}</span> : value}
      </span>
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLSpanElement>) {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      if (onSplit && !e.shiftKey) onSplit(caretOffset(e.currentTarget));
    } else if (e.key === "Backspace" && onJoin) {
      const sel = window.getSelection();
      if (sel?.isCollapsed && caretOffset(e.currentTarget) === 0) {
        e.preventDefault();
        onJoin();
      }
    }
  }

  // An empty field only has its greyed hint to click on. Browsers may then keep the cursor in the
  // neighbouring text, so take the cursor explicitly.
  function onMouseDown(e: MouseEvent<HTMLSpanElement>) {
    const el = e.currentTarget;
    if (el.textContent !== "") return;
    e.preventDefault();
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
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
      data-focus-key={focusKey}
      data-placeholder={placeholder}
      className={`rb-editable ${className ?? ""}`}
      style={{ ...style, whiteSpace }}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => api.setFocusedKey(focusKey)}
      onBlur={() => api.setFocusedKey(null)}
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
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
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
};

/** Text bound to one field of the resume data. */
export function Txt({ edit, value, multiline, placeholder, style, className }: TxtProps) {
  const api = useContext(EditContext);
  return (
    <EditableSpan
      value={value}
      focusKey={editKey(edit)}
      onChange={(text) => api?.onEdit(edit, text)}
      multiline={multiline}
      placeholder={placeholder}
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
  /** When set and every line is empty, one greyed line with this hint is shown. */
  ghostPlaceholder?: string;
  style?: CSSProperties;
};

/** A field with one point per line. Each line is edited on its own; Enter adds a point, Backspace joins. */
export function Lines({ edit, value, bullets = true, focusedKey, ghostPlaceholder, style }: LinesProps) {
  const api = useContext(EditContext);
  const lines = value.split("\n");

  let shown = lines
    .map((text, index) => ({ text, index }))
    .filter(({ text, index }) => text.trim() !== "" || focusedKey === editKey(edit, index));
  if (shown.length === 0 && ghostPlaceholder) shown = [{ text: lines[0] ?? "", index: 0 }];
  if (shown.length === 0) return null;

  function change(index: number, text: string) {
    const next = [...lines];
    next[index] = text.replace(/\s*\n+\s*/g, " ");
    api?.onEdit(edit, next.join("\n"));
  }

  function split(index: number, offset: number) {
    if (!api) return;
    const r = splitLineAt(value, index, offset);
    api.onEdit(edit, r.value);
    api.requestFocus({ key: editKey(edit, r.focusIndex), caret: "start" });
  }

  function join(index: number) {
    if (!api) return;
    const r = mergeLineUp(value, index);
    if (!r) return;
    api.onEdit(edit, r.value);
    api.requestFocus({ key: editKey(edit, r.focusIndex), caret: "end" });
  }

  const lineProps = (index: number, text: string) => (
    <EditableSpan
      value={text}
      focusKey={editKey(edit, index)}
      onChange={(t) => change(index, t)}
      placeholder={index === 0 ? ghostPlaceholder : undefined}
      onSplit={(offset) => split(index, offset)}
      onJoin={index > 0 ? () => join(index) : undefined}
    />
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
