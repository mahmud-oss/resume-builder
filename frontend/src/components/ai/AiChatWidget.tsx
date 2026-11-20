"use client";

import { useEffect, useRef, useState } from "react";

import { OPEN_AI_CHAT_EVENT } from "@/lib/upload/review";

import { useKeyboardOffset } from "@/lib/useKeyboardOffset";
import type { Edit } from "@/components/editor/FieldEditors";
import { topicLabel, topicStatus } from "@/lib/ai/topics";
import type { ResumeDoc } from "@/lib/resume/types";

import { DraftCard } from "./DraftCard";
import { useAiChat } from "./useAiChat";

const STATUS_MARK = {
  done: "✓",
  skipped: "–",
  current: "●",
  open: "○",
} as const;

/**
 * Chat with the assistant to build the CV, as a floating widget: a button in the corner opens a chat window
 * over the page (a bottom sheet on a phone). It asks one topic at a time and fills the CV in as you answer;
 * the page behind it updates live. Minimizing keeps the conversation.
 */
export function AiChatWidget({
  resumeId,
  doc,
  edit,
  compact,
  hideLauncher,
}: {
  resumeId: string;
  doc: ResumeDoc;
  edit: Edit;
  /** Phone layout: round launcher and a bottom sheet. */
  compact: boolean;
  /** Something else (the phone's field sheet) needs the corner. */
  hideLauncher: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const chat = useAiChat({ resumeId, doc, edit, active: everOpened });
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const keyboard = useKeyboardOffset();

  const assistantCount = chat.messages.filter(
    (m) => m.role === "assistant",
  ).length;
  const [seen, setSeen] = useState(assistantCount);
  const unread = !open && assistantCount > seen;

  function show() {
    setOpen(true);
    setEverOpened(true);
    setSeen(assistantCount);
  }
  // "Fill the gaps with AI chat" (after a CV import) opens the chat from elsewhere on the page.
  useEffect(() => {
    const openChat = () => show();
    window.addEventListener(OPEN_AI_CHAT_EVENT, openChat);
    return () => window.removeEventListener(OPEN_AI_CHAT_EVENT, openChat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantCount]);

  function minimize() {
    setOpen(false);
    setSeen(assistantCount);
  }

  // The assistant speaks first, the first time the widget is opened. (Guarded so React's development
  // double-run does not ask twice.)
  useEffect(() => {
    if (!everOpened || started.current) return;
    started.current = true;
    chat.start();
  }, [everOpened, chat]);

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "end" });
  }, [open, chat.messages.length, chat.busy, chat.error]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSeen(assistantCount);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, assistantCount]);

  const last = [...chat.messages].reverse().find((m) => m.role === "assistant");
  const replies =
    !chat.busy && last?.id === chat.messages.at(-1)?.id
      ? (last?.suggestedReplies ?? [])
      : [];
  const awaitingStart = chat.messages.length === 1 && chat.messages[0].hidden;

  function submit(text: string) {
    if (!text.trim() || chat.busy) return;
    chat.send(text);
    setInput("");
  }

  return (
    <>
      {!open && !hideLauncher && (
        <button
          type="button"
          onClick={show}
          aria-label="Open the AI assistant"
          style={{ bottom: 16 + keyboard }}
          className={`fixed right-4 z-40 flex h-12 items-center justify-center rounded-full bg-brand text-sm font-medium text-white shadow-lg hover:opacity-90 ${compact ? "w-12" : "px-5"}`}
        >
          <span aria-hidden>{compact ? "AI" : "✨ Build with AI"}</span>
          {chat.busy ? (
            <span
              role="status"
              aria-label="Working"
              className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-amber-400 ring-2 ring-white"
            />
          ) : (
            unread && (
              <span
                role="status"
                aria-label="New message"
                className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"
              />
            )
          )}
        </button>
      )}
      <section
        aria-label="AI assistant"
        hidden={!open}
        style={compact ? { bottom: keyboard } : undefined}
        className={
          compact
            ? "fixed inset-x-0 z-40 flex h-[72dvh] max-h-[calc(100dvh-3rem)] flex-col rounded-t-2xl border-t border-slate-300 bg-white shadow-2xl [&[hidden]]:hidden"
            : "fixed bottom-4 right-4 z-40 flex h-[min(640px,calc(100dvh-2rem))] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-slate-300 bg-white shadow-2xl [&[hidden]]:hidden"
        }
      >
        <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
          <h2 className="text-sm font-semibold">AI assistant</h2>
          {chat.demo && (
            <span
              className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900"
              title="No AI key is set, so a scripted stand-in answers."
            >
              Demo mode
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (
                  chat.messages.length === 0 ||
                  confirm(
                    "Start the conversation again? Your CV keeps everything already added.",
                  )
                ) {
                  chat.reset();
                  chat.start();
                }
              }}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={minimize}
              aria-label="Minimize the assistant"
              className="min-h-9 rounded px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Minimize
            </button>
          </div>
        </header>

        <nav
          aria-label="Topics"
          className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2"
        >
          {chat.topics.order.map((topic) => {
            const status = topicStatus(chat.topics, topic);
            return (
              <button
                key={topic}
                type="button"
                disabled={chat.busy}
                aria-current={status === "current" ? "step" : undefined}
                onClick={() => chat.jumpTo(topic)}
                title={
                  status === "done"
                    ? "Done. Tap to go back to it"
                    : status === "skipped"
                      ? "Skipped. Tap to do it now"
                      : "Tap to go to this topic"
                }
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
                  status === "current"
                    ? "border-brand bg-brand/10 text-brand"
                    : status === "done"
                      ? "border-green-300 bg-green-50 text-green-800"
                      : status === "skipped"
                        ? "border-slate-200 text-slate-400"
                        : "border-slate-300 text-slate-700"
                }`}
              >
                <span aria-hidden>{STATUS_MARK[status]} </span>
                {topicLabel(topic)}
                <span className="sr-only"> ({status})</span>
              </button>
            );
          })}
        </nav>

        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {chat.messages
            .filter((m) => !m.hidden)
            .map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={`max-w-[92%] space-y-2 ${m.role === "user" ? "" : "w-full"}`}
                >
                  <div
                    dir="auto"
                    className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "rounded-br-sm bg-brand text-white"
                        : "rounded-bl-sm bg-slate-100 text-slate-900"
                    }`}
                  >
                    {m.display ?? m.content}
                  </div>
                  {m.notes && (
                    <p className="px-1 text-xs italic text-slate-500">
                      Added to your CV: {m.notes.join(", ")}
                    </p>
                  )}
                  {m.drafts?.map((d) => (
                    <DraftCard
                      key={d.id}
                      draft={d}
                      replacing={chat.replacing(d)}
                      disabled={chat.busy}
                      onAccept={(text) => chat.accept(m.id, d, text)}
                      onRegenerate={(feedback) =>
                        chat.regenerate(m.id, d, feedback)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}

          {(chat.busy || awaitingStart) && !chat.error && (
            <p className="px-1 text-sm text-slate-500" role="status">
              Thinking…
            </p>
          )}
          {chat.error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              <p>{chat.error}</p>
              <button
                type="button"
                onClick={chat.retry}
                disabled={chat.busy}
                className="mt-1 font-medium underline"
              >
                Try again
              </button>
            </div>
          )}
          <div ref={bottom} />
        </div>

        <div className="border-t border-slate-200 px-3 pb-2 pt-2">
          {replies.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {replies.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => submit(r)}
                  className="min-h-9 rounded-full border border-brand/50 px-3 text-sm text-brand hover:bg-brand/5"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              aria-label="Message"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              rows={1}
              maxLength={2000}
              placeholder="Type your answer…"
              value={input}
              dir="auto"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
            />
            <button
              type="submit"
              disabled={chat.busy || input.trim() === ""}
              className="min-h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <p className="mt-1 text-[11px] text-slate-500">
            You can write in English, বাংলা or Banglish.
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            AI can make mistakes. Check everything before you send your CV. Your
            messages and CV details are processed by an AI provider (Anthropic)
            to write this.
          </p>
        </div>
      </section>
    </>
  );
}
