import type { ResumeDoc } from "@/lib/resume/types";

import { buildSnapshot } from "./snapshot";
import type { ChatDraft, ChatMessage, ChatResponse, TopicsState } from "./types";

/** Pure helpers for the chat: what to send, what to keep, and what to say. No screens in here. */

/** The server accepts at most 60 messages; keep the latest ones, always starting with a user message. */
const MAX_SENT = 40;

/** What the hidden opening message says. */
export const START_TEXT = "Please start.";

export function newMessageId(): string {
  return crypto.randomUUID();
}

export type ChatRequestBody = {
  messages: { role: "user" | "assistant"; content: string }[];
  cv: Record<string, unknown>;
  topics: TopicsState;
  /** Drafts the user has not accepted yet, so the assistant does not write them again. */
  pendingDrafts: { entry: string; field: string; text: string }[];
};

/** The drafts still waiting for a decision: the newest one for each field, and none the user replaced. */
export function pendingDrafts(messages: ChatMessage[]): ChatRequestBody["pendingDrafts"] {
  const latest = new Map<string, { entry: string; field: string; text: string }>();
  for (const m of messages) {
    for (const d of m.drafts ?? []) {
      const key = `${d.entry}/${d.field}`;
      if (d.status === "pending") latest.set(key, { entry: d.entry, field: d.field, text: d.text });
      else latest.delete(key);
    }
  }
  return [...latest.values()].slice(-10);
}

export function buildRequest(messages: ChatMessage[], doc: ResumeDoc, topics: TopicsState): ChatRequestBody {
  let sent = messages.slice(-MAX_SENT);
  while (sent.length > 0 && sent[0].role !== "user") sent = sent.slice(1);
  return {
    messages: sent.map((m) => ({ role: m.role, content: m.content })),
    cv: buildSnapshot(doc),
    topics,
    pendingDrafts: pendingDrafts(messages),
  };
}

/** The assistant's turn as a chat message, with its drafts waiting for a decision. */
export function assistantMessage(response: ChatResponse, notes: string[]): ChatMessage {
  const drafts: ChatDraft[] = response.drafts.map((d) => ({ ...d, status: "pending" }));
  return {
    id: newMessageId(),
    role: "assistant",
    content: response.message,
    notes: notes.length > 0 ? notes : undefined,
    drafts: drafts.length > 0 ? drafts : undefined,
    suggestedReplies: response.suggestedReplies.length > 0 ? response.suggestedReplies : undefined,
  };
}

/** Asking for a draft to be redone. The text goes with it, because the assistant only remembers its words. */
export function regenerateText(draft: ChatDraft, feedback: string): string {
  const how = feedback.trim() === "" ? "Please write it again, differently." : `Please write it again: ${feedback.trim()}.`;
  return `${how}\n\nThis is the draft to redo (for ${draft.entry}, ${draft.field}):\n"""\n${draft.text}\n"""`;
}

/** What the user sees for a regenerate request, shorter than what is sent. */
export function regenerateLabel(feedback: string): string {
  return feedback.trim() === "" ? "Write it again, please." : `Write it again: ${feedback.trim()}.`;
}

export function topicRequestText(label: string): string {
  return `Let's go to: ${label}.`;
}

// --- keeping a chat between visits -------------------------------------------------------------------

export type SavedChat = { messages: ChatMessage[]; topics: TopicsState };

const key = (resumeId: string) => `rb.chat.${resumeId}`;

export function loadChat(resumeId: string): SavedChat | null {
  try {
    const raw = localStorage.getItem(key(resumeId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedChat;
    if (!Array.isArray(saved.messages) || !saved.topics) return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveChat(resumeId: string, chat: SavedChat): void {
  try {
    localStorage.setItem(key(resumeId), JSON.stringify(chat));
  } catch {
    /* storage full or blocked: the chat just will not survive a reload */
  }
}

export function clearChat(resumeId: string): void {
  try {
    localStorage.removeItem(key(resumeId));
  } catch {
    /* nothing to do */
  }
}
