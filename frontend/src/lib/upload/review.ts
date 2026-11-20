/**
 * What the editor should tell the user after a CV was imported: the things to check. Kept in this tab's
 * session storage under the new resume's id, shown once, and never sent anywhere.
 */

export type ImportReview = { notes: string[]; demo: boolean };

const key = (resumeId: string) => `rb.import.${resumeId}`;

export function saveImportReview(resumeId: string, review: ImportReview) {
  try {
    sessionStorage.setItem(key(resumeId), JSON.stringify(review));
  } catch {
    /* storage blocked: the user just will not see the notes */
  }
}

export function readImportReview(resumeId: string): ImportReview | null {
  try {
    const raw = sessionStorage.getItem(key(resumeId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ImportReview>;
    return { notes: Array.isArray(v.notes) ? v.notes.filter((n) => typeof n === "string") : [], demo: v.demo === true };
  } catch {
    return null;
  }
}

export function clearImportReview(resumeId: string) {
  try {
    sessionStorage.removeItem(key(resumeId));
  } catch {
    /* nothing to clear */
  }
}

/**
 * The editor listens for this to open the AI chat (used by "Fill the gaps with AI chat" and by "I have this" on
 * Job match). `detail.prefill` is a first message to put in the box for the user to finish; it is never sent for them.
 */
export const OPEN_AI_CHAT_EVENT = "rb:open-ai-chat";

export type OpenAiChatDetail = { prefill?: string };
