import Link from "next/link";

import { ProBadge } from "@/components/app/ProBadge";
import { BRAND } from "@/lib/brand";

import { HeroActions } from "./HeroActions";
import { TemplateStrip } from "./TemplateStrip";

/**
 * The landing page (PRD §11.17): hero, the three ways to build, the tools that fit a CV to a job, how it works,
 * pricing, FAQ. English only, no reviews, no invented numbers, and the pricing says only what is decided
 * (free during early access; credits later; no prices yet). The sign-up buttons follow whether sign-up is open.
 */

const BUILD = [
  {
    title: "Fill it in",
    pro: false,
    text: "A form on one side and your CV on the other, updating as you type. Click the CV itself to edit the words. Switch template whenever you like and nothing is lost.",
  },
  {
    title: "Upload the CV you have",
    pro: true,
    text: "Upload a PDF or Word file, in English or Bangla, and get an editable CV in English, with a short list of what to double-check. Your file is read once and not stored.",
  },
  {
    title: "Chat with the AI",
    pro: false,
    text: "Answer a few questions in Bangla, Banglish or English and your CV fills in as you go. The AI writes drafts for you to accept, edit or redo, and only uses what you tell it.",
  },
] as const;

const TOOLS = [
  {
    title: "ATS checker",
    href: "/ats-checker",
    pro: false,
    text: "Many employers use software, called an ATS, that reads your CV before a person does. Pick one of your CVs or upload any CV file and see whether it can be read, and what to fix. The result is an estimate, not a promise.",
  },
  {
    title: "Job match",
    href: "/job-match",
    pro: true,
    text: "Paste a job description and see what your CV already shows, what the job asks for that it does not, and what to do about it. Every point comes with the words it is based on.",
  },
  {
    title: "Tailor my resume",
    href: "/tailor",
    pro: true,
    text: "Get a version of your CV that fits one job. The AI suggests wording changes and you accept or reject each one. It cannot add skills you do not have, and your original never changes.",
  },
] as const;

const STEPS = [
  { title: "Start your CV", text: "Fill in a template, chat with the AI, or upload the CV you already have." },
  { title: "Check it and match it", text: "See whether an ATS can read it, then paste a job description to see how well it fits." },
  { title: "Tailor and download", text: "Accept the wording changes you like, and download your CV as a PDF." },
] as const;

const PRINCIPLES = [
  { title: "Facts only", text: "The AI does not invent employers, dates, numbers or skills. It only uses what you gave it or what is already in your CV." },
  { title: "You decide", text: "Every AI suggestion is a draft. You accept it, edit it or ask for another." },
  { title: "Estimates, not promises", text: "Scores are labelled as estimates. We cannot see any employer's system, and we say so." },
  { title: "Your files stay yours", text: "An uploaded file is read once and not stored. AI features send the text involved to our AI provider, Anthropic, to write the answer." },
] as const;

const FAQ = [
  {
    q: "Is it free?",
    a: "Yes, while we are in early access. Later, AI help and PDF export will use credits, paid in small amounts with no subscription. Browsing templates and editing your CV will stay free. We have not set prices yet, and we will tell you before anything costs money.",
  },
  {
    q: "Does the AI make things up?",
    a: "It is built not to. It may only use facts you gave it or that are already in your CV, and we check its answers: for example, a skill is shown as matching only if we can quote your CV for it. AI can still make mistakes, so read everything before you use it.",
  },
  {
    q: "Which languages work?",
    a: "You can chat with the AI in Bangla, Banglish (Bangla in English letters) or English. You can upload a CV in English or Bangla. The CV itself is written in English, with names in English letters, and this website is in English.",
  },
  {
    q: "What is an ATS?",
    a: "An applicant tracking system is software many employers use to collect and sort CVs. It reads your CV as plain text, so scanned pages, tables, columns, text boxes and details hidden in a header can confuse it. The ATS checker looks for those problems. It is an estimate: we cannot see any particular employer's system.",
  },
  {
    q: "What happens to my CV and my files?",
    a: "Your resumes are kept in your account and only you can see them. An uploaded file is read once to make your CV and is not stored. When you use an AI feature, the text involved is sent to our AI provider, Anthropic, to write the answer.",
  },
  {
    q: "Can I use the tools with a CV I made somewhere else?",
    a: "Yes. The ATS checker and Job match work on any PDF or Word CV. Tailor my resume needs the CV to be in the builder, so import it first with Upload CV.",
  },
  {
    q: "Will you apply to jobs for me?",
    a: "No. We help you make a better CV, and you apply on the employer's own site.",
  },
  {
    q: "Will this get me a job?",
    a: "We cannot promise that. We help your CV be clear, readable and relevant to the job. The rest is up to you and the employer.",
  },
] as const;

function Heading({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
      {children}
    </h2>
  );
}

export function Landing() {
  return (
    <main>
      <section aria-labelledby="hero" className="bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">{BRAND.name} · early access</p>
          <h1 id="hero" className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            A CV that gets read.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Build your CV by chatting in Bangla, Banglish or English, or upload the one you already have. Then check it for ATS,
            match it to a job and tailor it, with AI that only uses facts you gave it.
          </p>
          <div className="mt-8">
            <HeroActions />
          </div>
          <p className="mt-4 text-sm text-slate-500">Everything is free while we test.</p>
        </div>
      </section>

      <section aria-labelledby="build" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <Heading id="build">Three ways to build your CV</Heading>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {BUILD.map((b) => (
            <li key={b.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                {b.title} {b.pro && <ProBadge />}
              </h3>
              <p className="mt-2 text-slate-600">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fit" className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <Heading id="fit">Make it fit the job</Heading>
          <p className="mt-2 max-w-2xl text-slate-600">
            Three tools for the part most people skip. They work on any CV, and you decide what changes.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {TOOLS.map((t) => (
              <li key={t.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  {t.title} {t.pro && <ProBadge />}
                </h3>
                <p className="mt-2 flex-1 text-slate-600">{t.text}</p>
                <Link href={t.href} className="mt-4 text-sm font-semibold text-brand hover:underline">
                  Open {t.title} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="how" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <Heading id="how">How it works</Heading>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-slate-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="honest" className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <Heading id="honest">AI you can check</Heading>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-slate-600">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="templates" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <Heading id="templates">One set of content, many looks</Heading>
        <p className="mt-2 max-w-2xl text-slate-600">
          Switch template at any time and nothing is lost. Here are a few of the templates; you can try them all without an account.
        </p>
        <TemplateStrip />
        <p className="mt-6">
          <Link href="/templates" className="font-semibold text-brand hover:underline">
            Browse all templates →
          </Link>
        </p>
      </section>

      <section aria-labelledby="pricing" className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <Heading id="pricing">Pricing</Heading>
          <p className="mt-2 max-w-2xl text-slate-600">
            Free while we are in early access. Later you will pay in small amounts for what you use, with credits and no monthly
            subscription, and we will tell you before anything costs money.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
                <li>Browse and preview every template</li>
                <li>Build and edit your CV with a live preview</li>
                <li>Switch template any time</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                Will use credits <ProBadge />
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
                <li>AI help: CV upload, Job match, Tailor my resume, and the AI parts of the ATS checker</li>
                <li>PDF export</li>
              </ul>
              <p className="mt-3 text-sm text-slate-500">Prices are not set yet. Today all of it is free.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <Heading id="faq">Questions</Heading>
        <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden className="text-slate-400 transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="start" className="bg-blue-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6">
          <h2 id="start" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Make your CV easier to read, and easier to say yes to.
          </h2>
          <div className="mt-6">
            <HeroActions center />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6">
          <p>
            {BRAND.name} · early access · English only
          </p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/templates" className="hover:text-slate-800">
              Templates
            </Link>
            <Link href="/login" className="hover:text-slate-800">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
