/** Tailored Resume's shapes (PRD §11.8). */

/** One proposed change, as the server sends it. `before` was read from the resume on the server. */
export type TailorChange = { id: string; entry: string; field: string; before: string; after: string; reason: string };

export type TailorResponse = { jobTitle: string; company: string; changes: TailorChange[]; demo: boolean };
export type RegenerateResponse = { after: string; reason: string; demo: boolean };

export type ChangeStatus = "pending" | "accepted" | "rejected";

/** A change on screen: what the user has decided, and the wording they currently have. */
export type ChangeItem = TailorChange & { status: ChangeStatus; text: string; edited: boolean };

/** One-tap steers for "Regenerate". */
export const REGENERATE_HINTS = ["More concise", "Simpler words", "More formal", "Highlight my results"] as const;
