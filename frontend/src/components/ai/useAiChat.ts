"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Edit } from "@/components/editor/FieldEditors";
import { aiApi, ApiError } from "@/lib/api";
import { currentText, draftMutation, planUpdates } from "@/lib/ai/apply";
import {
  assistantMessage,
  buildRequest,
  clearChat,
  loadChat,
  newMessageId,
  regenerateLabel,
  regenerateText,
  saveChat,
  START_TEXT,
  topicRequestText,
} from "@/lib/ai/chat";
import { emptyTopics, mergeTopics, topicLabel } from "@/lib/ai/topics";
import type { ChatDraft, ChatMessage, TopicsState } from "@/lib/ai/types";
import type { ResumeDoc } from "@/lib/resume/types";

export type AiChat = ReturnType<typeof useAiChat>;

/**
 * The chat builder's state: the conversation, the checklist, and what is happening now. The assistant's
 * answers are applied to the CV through `edit`, so Undo, autosave and the live preview all just work.
 */
export function useAiChat({
  resumeId,
  doc,
  edit,
  active = true,
}: {
  resumeId: string;
  doc: ResumeDoc;
  edit: Edit;
  /** False until the chat is first opened: no request is made before then. */
  active?: boolean;
}) {
  // A saved conversation for this resume is picked up when the panel opens. (The panel only exists in the
  // browser, after the editor has loaded, so reading local storage here is safe.)
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => loadChat(resumeId)?.messages ?? [],
  );
  const [topics, setTopics] = useState<TopicsState>(() => {
    const saved = loadChat(resumeId);
    return saved
      ? { ...saved.topics, order: emptyTopics(doc).order }
      : emptyTopics(doc);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState<boolean | null>(null);

  // The latest values, for use after an `await`.
  const docRef = useRef(doc);
  const topicsRef = useRef(topics);
  const messagesRef = useRef(messages);
  useEffect(() => {
    docRef.current = doc;
    topicsRef.current = topics;
  });

  /**
   * Every change to the conversation goes through here. The ref is updated at once, so a change made right
   * after another (marking a draft as replaced, then sending the request to redo it) builds on the first.
   */
  const changeMessages = useCallback(
    (change: (current: ChatMessage[]) => ChatMessage[]) => {
      const next = change(messagesRef.current);
      messagesRef.current = next;
      setMessages(next);
    },
    [],
  );

  // Find out whether the assistant is the demo.
  useEffect(() => {
    if (!active) return;
    let alive = true;
    aiApi
      .status()
      .then((s) => alive && setDemo(s.demo))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [active]);

  useEffect(() => {
    saveChat(resumeId, { messages, topics });
  }, [resumeId, messages, topics]);

  /** Asks the assistant for its next turn, given the conversation so far. */
  const run = useCallback(
    async (history: ChatMessage[]) => {
      setBusy(true);
      setError(null);
      try {
        const response = await aiApi.chat(
          buildRequest(history, docRef.current, topicsRef.current),
        );
        const plan = planUpdates(docRef.current, response.updates);
        if (response.updates.length > 0) edit(plan.mutation);
        if (plan.rejected.length > 0)
          console.warn(
            "The assistant sent updates that could not be applied:",
            plan.rejected,
          );
        const after = plan.mutation(docRef.current);
        setTopics((prev) =>
          mergeTopics(prev, after, {
            current: response.currentTopic,
            completed: response.completedTopics,
            skipped: response.skippedTopics,
          }),
        );
        changeMessages((prev) => [
          ...prev,
          assistantMessage(response, plan.notes),
        ]);
        setDemo(response.demo);
      } catch (e) {
        setError(
          e instanceof ApiError
            ? e.message
            : "Something went wrong. Please try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [edit, changeMessages],
  );

  const send = useCallback(
    (text: string, options: { hidden?: boolean; display?: string } = {}) => {
      const content = text.trim();
      if (!content || busy) return;
      const message: ChatMessage = {
        id: newMessageId(),
        role: "user",
        content,
        ...options,
      };
      changeMessages((prev) => [...prev, message]);
      void run(messagesRef.current);
    },
    [busy, run, changeMessages],
  );

  /** Opens the conversation: the assistant speaks first. */
  const start = useCallback(() => {
    if (messagesRef.current.length === 0) send(START_TEXT, { hidden: true });
  }, [send]);

  /** Tries the last request again after an error. */
  const retry = useCallback(() => {
    if (!busy && messagesRef.current.length > 0) void run(messagesRef.current);
  }, [busy, run]);

  const reset = useCallback(() => {
    clearChat(resumeId);
    changeMessages(() => []);
    setTopics(emptyTopics(docRef.current));
    setError(null);
  }, [resumeId, changeMessages]);

  const patchDraft = useCallback(
    (messageId: string, draftId: string, patch: Partial<ChatDraft>) => {
      changeMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                drafts: m.drafts?.map((d) =>
                  d.id === draftId ? { ...d, ...patch } : d,
                ),
              }
            : m,
        ),
      );
    },
    [changeMessages],
  );

  /** Puts a draft (as written, or as the user changed it) into the CV. */
  const accept = useCallback(
    (messageId: string, draft: ChatDraft, text?: string) => {
      const finalText = (text ?? draft.text).trim();
      const mutation = draftMutation(docRef.current, draft, finalText);
      if (!mutation) {
        setError(
          "That part of your CV is no longer there, so the draft could not be added.",
        );
        return;
      }
      edit(mutation);
      patchDraft(messageId, draft.id, { status: "accepted", text: finalText });
    },
    [edit, patchDraft],
  );

  const regenerate = useCallback(
    (messageId: string, draft: ChatDraft, feedback: string) => {
      patchDraft(messageId, draft.id, { status: "replaced" });
      send(regenerateText(draft, feedback), {
        display: regenerateLabel(feedback),
      });
    },
    [patchDraft, send],
  );

  const jumpTo = useCallback(
    (topic: string) => {
      setTopics((prev) => ({ ...prev, current: topic }));
      send(topicRequestText(topicLabel(topic)));
    },
    [send],
  );

  const replacing = useCallback(
    (draft: ChatDraft) => currentText(docRef.current, draft),
    [],
  );

  return {
    messages,
    topics,
    busy,
    error,
    demo,
    send,
    start,
    retry,
    reset,
    accept,
    regenerate,
    jumpTo,
    replacing,
  };
}
