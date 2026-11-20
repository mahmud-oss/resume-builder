/** The limits for an uploaded CV. The server checks them again; this just saves a wasted upload. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const UPLOAD_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Why a file cannot be used, or null when it is fine. */
export function fileProblem(file: { name: string; size: number }): string | null {
  if (!/\.(pdf|docx)$/i.test(file.name)) return "Please choose a PDF or Word (.docx) file.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "That file is too large. The limit is 4 MB.";
  return null;
}
