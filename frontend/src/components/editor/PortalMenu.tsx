"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A button that opens a floating panel. The panel is drawn on the page body, so it is never
 * clipped or scaled by the resume page it was opened from.
 */
export function PortalMenu({
  label,
  trigger,
  children,
  width = 260,
  triggerClassName = "",
}: {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  width?: number;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !button.current || !panel.current) return;
    const r = button.current.getBoundingClientRect();
    const h = panel.current.offsetHeight;
    const below = r.bottom + 6;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    panel.current.style.top = `${top}px`;
    panel.current.style.left = `${left}px`;
  });

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || button.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="true"
        aria-expanded={open}
        data-open={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            data-menu
            role="dialog"
            aria-label={label}
            style={{ position: "fixed", width, maxHeight: "70vh", overflowY: "auto", top: 0, left: 0 }}
            className="z-40 rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-xl"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </>
  );
}
