"use client";

import { useEffect } from "react";

import { OPEN_AI_CHAT_EVENT, type OpenAiChatDetail } from "@/lib/upload/review";

/**
 * Opens the AI chat when the page was reached with ?chat=... (the "I have this" link on Job match), with that text
 * ready in the box. The address is read directly, not through a hook, so the editor's page does not have to wait
 * for it. The parameter is removed so a reload does not open the chat again.
 */
export function ChatFromLink() {
  useEffect(() => {
    const prefill = new URL(window.location.href).searchParams.get("chat");
    if (!prefill) return;
    // After the chat widget has registered its listener. The parameter is removed only once the chat has been
    // asked to open: React may run this effect twice in development, and the second run must still see it.
    const t = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent<OpenAiChatDetail>(OPEN_AI_CHAT_EVENT, { detail: { prefill: prefill.slice(0, 500) } }));
      const url = new URL(window.location.href);
      url.searchParams.delete("chat");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
