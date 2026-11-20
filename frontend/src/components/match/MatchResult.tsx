import Link from "next/link";

import { ProBadge } from "@/components/app/ProBadge";
import type { CvSourceValue } from "@/lib/cv-source";
import { BAND_NAME, type MatchAnalysis, type MatchBand } from "@/lib/match/types";

const BAND_STYLE: Record<MatchBand, string> = {
  strong: "bg-green-50 text-green-800 ring-green-200",
  good: "bg-lime-50 text-lime-800 ring-lime-200",
  partial: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-red-50 text-red-800 ring-red-200",
};

/** Where "I have this" goes: the editor, with the AI chat open and a first message ready for the user to finish. */
export function haveThisHref(resumeId: string, skill: string): string {
  return `/editor/${resumeId}?chat=${encodeURIComponent(`I have experience with ${skill}.`)}`;
}

/** The whole Job match result: the band, what matches, what is missing, and what to do about it. */
export function MatchResult({
  analysis,
  source,
  onImport,
  importing,
}: {
  analysis: MatchAnalysis;
  source: CvSourceValue;
  onImport: () => void;
  importing: boolean;
}) {
  const required = analysis.missing.filter((m) => m.importance === "required");
  const nice = analysis.missing.filter((m) => m.importance === "nice");
  const saved = source.kind === "saved" ? source : null;

  const missingRow = (m: MatchAnalysis["missing"][number]) => (
    <li key={m.skill} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{m.skill}</p>
        <p className="text-sm text-slate-500">The job says: “{m.jdQuote}”</p>
      </div>
      {saved && (
        <Link href={haveThisHref(saved.id, m.skill)} className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          I have this
        </Link>
      )}
    </li>
  );

  return (
    <section aria-label="Result" className="mt-6">
      <div className={`rounded-xl p-5 ring-1 ${BAND_STYLE[analysis.band]}`}>
        <p className="text-sm font-medium uppercase tracking-wide opacity-80">Estimate</p>
        <p className="text-3xl font-bold">{BAND_NAME[analysis.band]}</p>
        {(analysis.jobTitle || analysis.company) && (
          <p className="mt-1 text-sm font-medium">
            {[analysis.jobTitle, analysis.company].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-2 text-sm">{analysis.summary}</p>
        <p className="mt-2 text-xs opacity-80">
          This is an AI estimate of how well your CV fits this job. It is not a measurement and not what an employer&apos;s
          system will decide.
          {analysis.demo && " Demo mode: this is a rough sample, not a real analysis."}
        </p>
      </div>

      <h2 className="mt-6 text-lg font-semibold">What your CV already shows ({analysis.matching.length})</h2>
      {analysis.matching.length === 0 ? (
        <p className="mt-2 text-slate-600">We could not find anything in your CV that the job asks for.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {analysis.matching.map((m) => (
            <li key={m.skill} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium text-slate-900">{m.skill}</p>
              <p className="text-sm text-slate-500">Your CV says: “{m.evidence}”</p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-lg font-semibold">What the job asks for that your CV does not show</h2>
      {analysis.missing.length === 0 ? (
        <p className="mt-2 text-slate-600">Nothing important is missing.</p>
      ) : (
        <>
          {required.length > 0 && (
            <>
              <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-red-700">Required ({required.length})</h3>
              <ul className="mt-2 space-y-2">{required.map(missingRow)}</ul>
            </>
          )}
          {nice.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-amber-700">Nice to have ({nice.length})</h3>
              <ul className="mt-2 space-y-2">{nice.map(missingRow)}</ul>
            </>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Only add a skill to your CV if it is true.
            {saved
              ? " “I have this” opens the AI chat in the editor so you can say where and how you used it."
              : " To add a skill you really have, import this CV into the builder first."}
          </p>
        </>
      )}

      {analysis.suggestions.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-semibold">What to do</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-800">
            {analysis.suggestions.map((s, i) => (
              <li key={i}>{s.text}</li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {saved ? (
          <Link href={`/editor/${saved.id}`} className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50">
            Open “{saved.title || "Untitled resume"}” in the editor
          </Link>
        ) : (
          <button
            type="button"
            disabled={importing}
            onClick={onImport}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            {importing ? "Importing…" : "Import into the builder"}
          </button>
        )}
      </div>

      <section aria-label="Tailor my resume" className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-500">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700">
          Tailor my resume for this job <ProBadge />
        </h2>
        <p className="mt-1 text-sm">Make a version of your resume that fits this job, using only what is already in it. Coming soon.</p>
      </section>
    </section>
  );
}
