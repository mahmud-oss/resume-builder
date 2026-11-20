import type { Snapshot } from "@/lib/ai/snapshot";
import { resolveEntry } from "@/lib/ai/snapshot";
import { applyEdit } from "@/lib/resume/mutations";
import type { ResumeDoc } from "@/lib/resume/types";

import type { ChangeItem } from "./types";

/**
 * Puts the accepted changes into a copy of the resume. The original is never touched: every edit returns a new
 * document. A change whose entry cannot be found any more is skipped, never guessed at.
 */
export function applyAccepted(doc: ResumeDoc, items: Pick<ChangeItem, "entry" | "field" | "text" | "status">[]): ResumeDoc {
  let next = doc;
  for (const item of items) {
    if (item.status !== "accepted") continue;
    const at = resolveEntry(doc, item.entry); // refs are read against the document the changes were proposed for
    if (!at) continue;
    next = applyEdit({ kind: "item", sectionId: at.sectionId, itemId: at.itemId, field: item.field }, item.text)(next);
  }
  return next;
}

/** Where a change is, in words: "Experience" and "Accounts Assistant at Sample Traders". */
export function describeEntry(snapshot: Snapshot, ref: string): { section: string; label: string } {
  const sections = (snapshot.sections as { title: string; type: string; entries: { ref: string; values: Record<string, string> }[] }[]) ?? [];
  for (const s of sections) {
    const e = s.entries.find((x) => x.ref === ref);
    if (!e) continue;
    const v = e.values;
    switch (s.type) {
      case "experience":
        return { section: s.title, label: [v.role, v.company].filter(Boolean).join(" at ") || "Job" };
      case "projects":
        return { section: s.title, label: v.name || "Project" };
      case "skills":
        return { section: s.title, label: v.category || "Skills" };
      default:
        return { section: s.title, label: s.title };
    }
  }
  return { section: "Resume", label: ref };
}

/** What kind of change it is, for the card's heading. */
export function kindOf(field: string): "Summary" | "Bullet points" | "Order of skills" {
  if (field === "skills") return "Order of skills";
  if (field === "description") return "Bullet points";
  return "Summary";
}

/** A name for the new version: the original's title and what it was tailored for. */
export function versionTitle(masterTitle: string, jobTitle: string, company: string): string {
  const base = masterTitle.trim() || "Resume";
  const target = jobTitle.trim() || company.trim();
  return (target ? `${base} · ${target}` : `${base} · Tailored`).slice(0, 200);
}

export function countByStatus(items: Pick<ChangeItem, "status">[]) {
  return {
    accepted: items.filter((i) => i.status === "accepted").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    pending: items.filter((i) => i.status === "pending").length,
  };
}
