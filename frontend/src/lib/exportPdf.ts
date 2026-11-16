import { getToken } from "@/lib/api";
import { fileNameFromDisposition } from "@/lib/export/validate";
import type { ResumeDoc } from "@/lib/resume/types";

/** Asks the server for the PDF of this CV and saves it as a file download. Throws an Error with a readable message. */
export async function downloadPdf(doc: ResumeDoc): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Please sign in to export your CV.");

  let res: Response;
  try {
    res = await fetch("/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ doc }),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection.");
  }
  if (!res.ok) {
    let message = `Could not make the PDF (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const name = fileNameFromDisposition(res.headers.get("content-disposition")) ?? "Resume.pdf";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
