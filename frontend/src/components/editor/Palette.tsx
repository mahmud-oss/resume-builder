"use client";

/** A row of colour swatches plus a custom colour box. `null` means "use the template default" when `allowAuto` is set. */
export function Palette({
  label,
  value,
  colors,
  onChange,
  allowAuto,
}: {
  label: string;
  value: string | null;
  colors: string[];
  onChange: (color: string | null, key?: string) => void;
  allowAuto?: boolean;
}) {
  const current = value?.toLowerCase() ?? null;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {allowAuto && (
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={`h-6 rounded-full border px-2 text-xs ${value === null ? "border-brand bg-brand/10 font-medium text-brand" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          Auto
        </button>
      )}
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`${label} ${c}`}
          aria-pressed={current === c}
          onClick={() => onChange(c)}
          style={{ background: c }}
          className={`h-6 w-6 rounded-full ring-offset-1 ${current === c ? "ring-2 ring-slate-900" : "ring-1 ring-black/10"}`}
        />
      ))}
      <label className="flex items-center gap-1 text-xs text-slate-600">
        <span className="sr-only">Custom {label}</span>
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value, "color")}
          className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
        />
      </label>
    </div>
  );
}
