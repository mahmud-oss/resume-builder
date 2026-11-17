import type { ResumeDoc, SectionType } from "@/lib/resume/types";

import type { TopicsState } from "./types";

/**
 * The fixed order the assistant follows. The summary comes last, because it is written from everything
 * else. Only topics the CV actually has are used, so the questions follow the sections of the CV.
 */
const SECTION_ORDER: SectionType[] = [
  "experience",
  "education",
  "projects",
  "skills",
  "languages",
  "certifications",
  "references",
  "custom",
  "summary",
];

const LABELS: Record<string, string> = {
  basics: "Contact details",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  languages: "Languages",
  certifications: "Certifications",
  references: "References",
  custom: "Other",
  summary: "Summary",
};

export function topicLabel(topic: string): string {
  return LABELS[topic] ?? topic;
}

/** "basics" first, then each kind of section the CV has, in the fixed order. */
export function topicOrder(doc: ResumeDoc): string[] {
  const present = new Set(doc.data.sections.filter((s) => !s.hidden).map((s) => s.type));
  return ["basics", ...SECTION_ORDER.filter((t) => present.has(t))];
}

export function emptyTopics(doc: ResumeDoc): TopicsState {
  return { order: topicOrder(doc), completed: [], skipped: [], current: "basics" };
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

/**
 * Brings the checklist up to date with what the assistant said. Topics it names that the CV does not have
 * are ignored; a topic is never both done and skipped, and what was done stays done.
 */
export function mergeTopics(previous: TopicsState, doc: ResumeDoc, reply: { current: string; completed: string[]; skipped: string[] }): TopicsState {
  const order = topicOrder(doc);
  const known = (list: string[]) => list.filter((t) => order.includes(t));
  // A topic being worked on now is not skipped any more (the user went back to it).
  const skipped = union(previous.skipped, known(reply.skipped)).filter((t) => t !== reply.current);
  const completed = union(previous.completed, known(reply.completed)).filter((t) => !skipped.includes(t) || reply.completed.includes(t));
  return {
    order,
    completed,
    skipped: skipped.filter((t) => !completed.includes(t)),
    current: order.includes(reply.current) ? reply.current : reply.current === "" ? "" : previous.current,
  };
}

export type TopicStatus = "done" | "skipped" | "current" | "open";

export function topicStatus(state: TopicsState, topic: string): TopicStatus {
  if (state.completed.includes(topic)) return "done";
  if (state.skipped.includes(topic)) return "skipped";
  if (state.current === topic) return "current";
  return "open";
}
