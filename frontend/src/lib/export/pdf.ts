import "server-only";

import { chromium, type Browser } from "playwright";

import type { ResumeDoc } from "@/lib/resume/types";

/**
 * Makes a PDF by opening our own /print page in headless Chromium, handing it the CV, and printing it.
 * What the PDF shows is exactly what the template renders: the same code draws the page.
 */

// One browser is kept and reused (starting Chromium takes a second or two); each export gets its own
// isolated context. If the browser dies it is started again on the next export.
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium
      .launch()
      .then((b) => {
        b.on("disconnected", () => {
          browserPromise = null;
        });
        return b;
      })
      .catch((e) => {
        browserPromise = null;
        throw e;
      });
  }
  return browserPromise;
}

// Rendering is heavy, so only a few run at once; the rest wait their turn.
const MAX_AT_ONCE = 2;
let running = 0;
const waiting: Array<() => void> = [];

async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= MAX_AT_ONCE) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export type RenderedPdf = { pdf: Buffer; pages: number };

/** Renders the CV to an A4 PDF. `origin` is where this app is reachable from this machine. */
export function renderPdf(origin: string, doc: ResumeDoc): Promise<RenderedPdf> {
  return slot(async () => {
    const browser = await getBrowser();
    const context = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      await page.addInitScript((d) => {
        (window as unknown as { __RESUME_DOC__: unknown }).__RESUME_DOC__ = d;
      }, doc);
      await page.goto(`${origin}/print`, { waitUntil: "networkidle", timeout: 30_000 });
      // The page says it is ready once fonts have loaded and the pages have been measured.
      await page.waitForSelector('[data-ready="true"]', { timeout: 30_000 });
      // The development overlay is not part of the CV.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      const pages = Number((await page.getAttribute("[data-pages]", "data-pages")) ?? "1");
      const pdf = await page.pdf({
        width: "210mm",
        height: "297mm",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        preferCSSPageSize: true,
      });
      return { pdf, pages };
    } finally {
      await context.close();
    }
  });
}
