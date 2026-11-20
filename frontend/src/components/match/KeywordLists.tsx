import type { MatchAnalysis } from "@/lib/match/types";

/** Just the keywords: what the CV already shows and what the job asks for that it lacks (the ATS tab's view). */
export function KeywordLists({ analysis }: { analysis: MatchAnalysis }) {
  const required = analysis.missing.filter((m) => m.importance === "required");
  const nice = analysis.missing.filter((m) => m.importance === "nice");
  const chip = (text: string, tone: string) => (
    <li key={text} className={`rounded-full px-3 py-1 text-sm ${tone}`}>
      {text}
    </li>
  );
  return (
    <div className="mt-3 space-y-4 text-sm">
      <div>
        <p className="font-medium text-slate-800">Your CV has ({analysis.matching.length})</p>
        {analysis.matching.length === 0 ? (
          <p className="mt-1 text-slate-600">None of the job&apos;s keywords were found.</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-2">{analysis.matching.map((m) => chip(m.skill, "bg-green-100 text-green-800"))}</ul>
        )}
      </div>
      {required.length > 0 && (
        <div>
          <p className="font-medium text-slate-800">The job requires, and your CV does not show ({required.length})</p>
          <ul className="mt-1 flex flex-wrap gap-2">{required.map((m) => chip(m.skill, "bg-red-100 text-red-800"))}</ul>
        </div>
      )}
      {nice.length > 0 && (
        <div>
          <p className="font-medium text-slate-800">Nice to have, and not shown ({nice.length})</p>
          <ul className="mt-1 flex flex-wrap gap-2">{nice.map((m) => chip(m.skill, "bg-amber-100 text-amber-800"))}</ul>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Only add a keyword to your CV if it is true. {analysis.demo && "Demo mode: this is a rough sample, not a real analysis. "}
      </p>
    </div>
  );
}
