"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ProBadge } from "@/components/app/ProBadge";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { CvSource } from "@/components/cv/CvSource";
import { JdBox } from "@/components/match/JdBox";
import { useMatch } from "@/components/match/useMatch";
import { aiApi, ApiError, resumeApi } from "@/lib/api";
import { keyOf, snapshotOf, type CvSourceValue } from "@/lib/cv-source";
import { jdProblem, readJd } from "@/lib/jd";
import { fingerprint } from "@/lib/match/session";
import type { Language } from "@/lib/match/types";
import { PRO_HINT } from "@/lib/pro";
import { applyAccepted, countByStatus, versionTitle } from "@/lib/tailor/apply";
import type { ChangeItem } from "@/lib/tailor/types";

import { ChangeCard } from "./ChangeCard";

type Phase = "idle" | "matching" | "warn" | "tailoring" | "review";

/** What the changes were proposed for. If the resume or job description changes, they no longer apply. */
type Proposal = { forKey: string; jobTitle: string; company: string; demo: boolean; items: ChangeItem[] };

function Page() {
  const router = useRouter();
  const [source, setSource] = useState<CvSourceValue | null>(null);
  // Safe to read here: this page only mounts in the browser, after the sign-in check.
  const [jd, setJd] = useState(() => readJd());
  const [language, setLanguage] = useState<Language>("en");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const match = useMatch(source, jd, language);

  const saved = source?.kind === "saved" ? source : null;
  const snapshot = useMemo(() => (source ? snapshotOf(source) : null), [source]);
  const currentKey = useMemo(() => (source ? `${keyOf(source)}|${fingerprint(jd.trim())}` : ""), [source, jd]);
  const live = proposal && proposal.forKey === currentKey ? proposal : null;
  const stale = !!proposal && !live;
  const problem = jd.trim() === "" ? null : jdProblem(jd);
  const ready = !!saved && jdProblem(jd) === null && phase !== "matching" && phase !== "tailoring";

  async function findChanges() {
    if (!saved || !snapshot) return;
    setPhase("tailoring");
    setError(null);
    try {
      const r = await aiApi.tailor(snapshot, jd.trim(), language);
      const items: ChangeItem[] = r.changes.map((c) => ({ ...c, status: "pending", text: c.after, edited: false }));
      setProposal({ forKey: currentKey, jobTitle: r.jobTitle, company: r.company, demo: r.demo, items });
      setTitle(versionTitle(saved.title, r.jobTitle, r.company));
      setPhase("review");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      setPhase("idle");
    }
  }

  async function start() {
    if (!ready) return;
    setError(null);
    setProposal(null);
    setPhase("matching");
    // The same analysis Job match uses: reused if it was already made for this resume and job description.
    const analysis = match.analysis ?? (await match.run(language));
    if (!analysis) {
      setPhase("idle");
      return;
    }
    if (analysis.band === "low") setPhase("warn"); // warn, but still allow (PRD TR-05)
    else await findChanges();
  }

  function update(next: ChangeItem) {
    setProposal((p) => (p ? { ...p, items: p.items.map((i) => (i.id === next.id ? next : i)) } : p));
  }

  function setAll(status: "accepted" | "rejected") {
    setProposal((p) => (p ? { ...p, items: p.items.map((i) => (status === "accepted" && i.text.trim() === "" ? i : { ...i, status })) } : p));
  }

  async function createVersion() {
    if (!saved || !live) return;
    setCreating(true);
    setError(null);
    try {
      const doc = applyAccepted(saved.doc, live.items);
      const created = await resumeApi.create({
        title: title.trim() || versionTitle(saved.title, live.jobTitle, live.company),
        templateId: doc.templateId,
        data: doc.data,
        design: doc.design,
        tailoredFrom: saved.id,
      });
      router.push(`/editor/${created.id}`);
    } catch (e) {
      setCreating(false);
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  }

  const counts = live ? countByStatus(live.items) : null;
  const radio = (value: Language, label: string) => (
    <label className="flex items-center gap-1.5 text-sm">
      <input type="radio" name="tailor-language" checked={language === value} onChange={() => setLanguage(value)} />
      {label}
    </label>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        Tailor my resume <ProBadge />
      </h1>
      <p className="mt-1 text-xs text-slate-500">{PRO_HINT}</p>
      <p className="mt-2 text-slate-600">
        Make a version of your resume that fits one job. The AI suggests small wording changes, using only what is already
        in your resume; you accept or reject each one. Your original is never changed: the result is a new resume.
      </p>

      <div className="mt-6">
        <CvSource value={source} onChange={setSource} savedOnly originalsOnly />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Tailoring works on your resumes in the builder.{" "}
        <Link href="/upload" className="text-brand hover:underline">
          Import a CV
        </Link>{" "}
        or{" "}
        <Link href="/templates" className="text-brand hover:underline">
          build one
        </Link>{" "}
        if you do not have one yet.
      </p>

      <div className="mt-6">
        <JdBox value={jd} onChange={setJd} />
        {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">Explain in</legend>
        <div className="mt-1 flex gap-4">
          {radio("en", "English")}
          {radio("bn", "বাংলা")}
        </div>
        <p className="mt-1 text-xs text-slate-500">Only the reasons change. The resume itself stays in English.</p>
      </fieldset>

      <button
        type="button"
        disabled={!ready}
        onClick={() => void start()}
        className="mt-5 rounded-md bg-brand px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {phase === "matching" ? "Checking the fit…" : phase === "tailoring" ? "Finding changes…" : live ? "Find changes again" : "Find changes"}
      </button>
      {!saved && <p className="mt-2 text-sm text-slate-500">Choose a resume first.</p>}

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {phase === "warn" && (
        <section role="alert" aria-label="Low match" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">This job looks like a low match for your resume.</p>
          <p className="mt-1 text-sm">
            Tailoring can reword what is already in your resume, but it cannot add skills you do not have. You can still
            continue. You can see why on the{" "}
            <Link href="/job-match" className="underline">
              Job match
            </Link>{" "}
            page.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void findChanges()} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">
              Continue anyway
            </button>
            <button type="button" onClick={() => setPhase("idle")} className="rounded-md border border-amber-300 px-3 py-1.5 text-sm hover:bg-amber-100">
              Cancel
            </button>
          </div>
        </section>
      )}

      {stale && (
        <p className="mt-6 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
          The resume or the job description changed, so the changes below no longer fit. Press “Find changes” again.
        </p>
      )}

      {live && snapshot && counts && saved && (
        <section aria-label="Proposed changes" className="mt-6">
          <h2 className="text-lg font-semibold">
            {live.items.length === 0 ? "No changes suggested" : `${live.items.length} suggested ${live.items.length === 1 ? "change" : "changes"}`}
            {(live.jobTitle || live.company) && (
              <span className="ml-2 text-sm font-normal text-slate-500">for {[live.jobTitle, live.company].filter(Boolean).join(" · ")}</span>
            )}
          </h2>
          {live.items.length === 0 ? (
            <p className="mt-2 text-slate-600">
              Your resume already says what it can for this job in its own words, so there is nothing to reword. Add what is
              missing through the AI chat in the editor if it is true.
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <button type="button" onClick={() => setAll("accepted")} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">
                  Accept all
                </button>
                <button type="button" onClick={() => setAll("rejected")} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">
                  Reject all
                </button>
                <span className="text-slate-500">
                  {counts.accepted} accepted · {counts.rejected} rejected · {counts.pending} not decided
                </span>
              </div>
              <ul className="mt-3 space-y-3">
                {live.items.map((item) => (
                  <ChangeCard key={item.id} item={item} snapshot={snapshot} jd={jd.trim()} language={language} onChange={update} />
                ))}
              </ul>

              <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
                <label htmlFor="version-title" className="block text-sm font-medium text-slate-700">
                  Name of the new resume
                </label>
                <input
                  id="version-title"
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
                <button
                  type="button"
                  disabled={counts.accepted === 0 || creating}
                  onClick={() => void createVersion()}
                  className="mt-3 rounded-md bg-brand px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {creating ? "Creating…" : `Create version${counts.accepted > 0 ? ` with ${counts.accepted} ${counts.accepted === 1 ? "change" : "changes"}` : ""}`}
                </button>
                {counts.accepted === 0 && <p className="mt-2 text-xs text-slate-500">Accept at least one change to create a version.</p>}
                <p className="mt-2 text-xs text-slate-500">
                  Only the changes you accepted go in. “{saved.title || "Untitled resume"}” stays exactly as it is.
                  {live.demo && " Demo mode: these are sample changes."} AI can make mistakes: read each change and accept only what is true.
                  Your resume text is sent to our AI provider (Anthropic) to write this.
                </p>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

export function Tailor() {
  return (
    <RequireAuth>
      <Page />
    </RequireAuth>
  );
}
