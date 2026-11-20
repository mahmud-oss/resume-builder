import { PRO_HINT } from "@/lib/pro";

/** A small "Pro" label for a feature that will be paid later. The hint is also spoken by screen readers. */
export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title={PRO_HINT}
      aria-label={`Pro. ${PRO_HINT}`}
      className={`inline-block rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase leading-4 tracking-wide text-amber-800 ${className}`}
    >
      Pro
    </span>
  );
}
