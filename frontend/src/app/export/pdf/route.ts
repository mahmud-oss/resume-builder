import type { NextRequest } from "next/server";

import { renderPdf } from "@/lib/export/pdf";
import { contentDisposition, MAX_BODY_BYTES, parseExportRequest, pdfFileName } from "@/lib/export/validate";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

function problem(status: number, message: string) {
  return Response.json({ message }, { status });
}

/**
 * POST /export/pdf  { doc }  ->  the CV as a PDF.
 *
 * Only for signed-in users: the token is checked with the backend. The CV is sent in the request so the
 * PDF always matches what is on screen, including changes that have not finished saving.
 */
export async function POST(request: NextRequest) {
  // Payment is not decided yet. Turning this on blocks export until credits exist.
  if (process.env.EXPORT_REQUIRES_PAYMENT === "true") {
    return problem(402, "Exporting needs credits, which are not available yet.");
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return problem(401, "Please sign in to export your CV.");
  try {
    const me = await fetch(`${BACKEND_URL}/api/me`, { headers: { Authorization: auth }, cache: "no-store" });
    if (!me.ok) return problem(401, "Your session has expired. Please sign in again.");
  } catch {
    return problem(503, "Could not reach the server. Please try again.");
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return problem(413, "This CV is too large to export.");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return problem(413, "This CV is too large to export.");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return problem(400, "The request body is not valid JSON.");
  }
  const parsed = parseExportRequest(body);
  if (!parsed.ok) return problem(parsed.status, parsed.error);

  try {
    // Always our own address, never one supplied by the caller. Set EXPORT_BASE_URL behind a proxy.
    const origin = process.env.EXPORT_BASE_URL ?? request.nextUrl.origin;
    const { pdf, pages } = await renderPdf(origin, parsed.doc);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(pdfFileName(parsed.doc.title)),
        "Cache-Control": "no-store",
        "X-Pdf-Pages": String(pages),
      },
    });
  } catch (e) {
    console.error("PDF export failed:", e);
    return problem(500, "Could not make the PDF. Please try again.");
  }
}
