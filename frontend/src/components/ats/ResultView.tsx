import { BAND_LABEL } from "@/lib/ats/rules";
import type { AtsResult, Band, Finding } from "@/lib/ats/types";

const BAND_STYLE: Record<Band, string> = {
  strong: "bg-green-50 text-green-800 ring-green-200",
  good: "bg-lime-50 text-lime-800 ring-lime-200",
  fair: "bg-amber-50 text-amber-800 ring-amber-200",
  "needs-work": "bg-red-50 text-red-800 ring-red-200",
};

const SEVERITY_LABEL = { critical: "Fix first", warning: "Improve", note: "Note", ok: "OK" } as const;
const SEVERITY_STYLE = {
  critical: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  note: "bg-slate-100 text-slate-700",
  ok: "bg-green-100 text-green-800",
} as const;

function FindingRow({ f }: { f: Finding }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase leading-4 ${SEVERITY_STYLE[f.severity]}`}>
          {SEVERITY_LABEL[f.severity]}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{f.title}</p>
          {f.detail && <p className="mt-0.5 text-sm text-slate-600">{f.detail}</p>}
          {f.fix && (
            <p className="mt-1 text-sm text-slate-800">
              <span className="font-medium">What to do: </span>
              {f.fix}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/** The band, the problems to fix, the notes, and (folded away) what is already fine. */
export function ResultView({ result, fromFile }: { result: AtsResult; fromFile: boolean }) {
  const problems = result.findings.filter((f) => f.severity === "critical" || f.severity === "warning");
  const notes = result.findings.filter((f) => f.severity === "note");
  const fine = result.findings.filter((f) => f.severity === "ok");

  return (
    <section aria-label="Result" className="mt-6">
      <div className={`rounded-xl p-5 ring-1 ${BAND_STYLE[result.band]}`}>
        <p className="text-sm font-medium uppercase tracking-wide opacity-80">Estimate</p>
        <p className="text-3xl font-bold">{BAND_LABEL[result.band]}</p>
        <p className="mt-2 text-sm">
          {result.counts.critical} to fix first · {result.counts.warning} to improve · about {result.words} words ·{" "}
          {result.pagesEstimated ? "roughly " : ""}
          {result.pages} {result.pages === 1 ? "page" : "pages"}
        </p>
        <p className="mt-2 text-xs opacity-80">
          This is an estimate of how easily an applicant tracking system (ATS) can read your CV. It is not a measurement
          and not what any employer&apos;s system will compute.
          {fromFile && " The checks on your file are rules of thumb, not a real ATS."}
        </p>
      </div>

      <h2 className="mt-6 text-lg font-semibold">Needs improvement</h2>
      {problems.length === 0 ? (
        <p className="mt-2 text-slate-600">Nothing to fix. Nice work.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {problems.map((f) => (
            <FindingRow key={f.id} f={f} />
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-semibold">Worth knowing</h2>
          <ul className="mt-2 space-y-2">
            {notes.map((f) => (
              <FindingRow key={f.id} f={f} />
            ))}
          </ul>
        </>
      )}

      {fine.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-lg font-semibold">Looks fine ({fine.length})</summary>
          <ul className="mt-2 space-y-2">
            {fine.map((f) => (
              <FindingRow key={f.id} f={f} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
