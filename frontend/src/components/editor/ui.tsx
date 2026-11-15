import type { ButtonHTMLAttributes, Ref } from "react";

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

/** Small square button with only an icon. `label` is required for screen readers and the tooltip. */
export function IconButton({
  label,
  active,
  className = "",
  ref,
  ...rest
}: { label: string; active?: boolean; ref?: Ref<HTMLButtonElement> } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent ${active ? "bg-slate-100 text-brand" : ""} ${className}`}
      {...rest}
    />
  );
}
