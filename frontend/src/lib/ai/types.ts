/** The shapes exchanged with the backend's /api/ai/chat. */

export type UpdateAction = "set_basics" | "set_field" | "add_entry" | "add_section";

export type AiUpdate = {
  action: UpdateAction;
  section: string;
  entry: string;
  field: string;
  value: string;
  values: { field: string; value: string }[];
};

export type ServerDraft = {
  id: string;
  entry: string;
  field: string;
  text: string;
  warnings: string[];
};

export type ChatResponse = {
  message: string;
  updates: AiUpdate[];
  drafts: ServerDraft[];
  currentTopic: string;
  completedTopics: string[];
  skippedTopics: string[];
  suggestedReplies: string[];
  demo: boolean;
};

export type AiStatus = { enabled: boolean; demo: boolean; model: string };

export type DraftStatus = "pending" | "accepted" | "replaced";

/** A piece of text the assistant wrote for the user to accept, change or have redone. */
export type ChatDraft = ServerDraft & { status: DraftStatus };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Sent to the assistant but not shown (the opening "please start"). */
  hidden?: boolean;
  /** What to show when it differs from what was sent (a request to redo a draft carries the draft). */
  display?: string;
  /** Short notes on what the assistant put into the CV in this turn, shown under its message. */
  notes?: string[];
  drafts?: ChatDraft[];
  suggestedReplies?: string[];
};

export type TopicsState = {
  /** The topics in the order to follow. */
  order: string[];
  completed: string[];
  skipped: string[];
  current: string;
};
