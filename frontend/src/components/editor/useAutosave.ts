"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { resumeApi } from "@/lib/api";
import type { HistoryState } from "@/lib/resume/history";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const DEBOUNCE_MS = 800;
const RETRY_MS = 5000;

/**
 * Saves the resume shortly after it stops changing. Only one save runs at a time; if the
 * document changed while saving, another save follows. A failed save is retried.
 */
export function useAutosave(id: string, state: HistoryState) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const savedRevision = useRef(state.revision);
  const latest = useRef(state);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRef = useRef<() => void>(() => {});

  useEffect(() => {
    latest.current = state;
  });

  const run = useCallback(async () => {
    if (saving.current) return;
    const snapshot = latest.current;
    if (snapshot.revision === savedRevision.current) return;
    saving.current = true;
    setStatus("saving");
    try {
      const { title, templateId, data, design } = snapshot.present;
      await resumeApi.update(id, { title, templateId, data, design });
      savedRevision.current = snapshot.revision;
      saving.current = false;
      if (latest.current.revision !== savedRevision.current) {
        timer.current = setTimeout(() => runRef.current(), DEBOUNCE_MS);
        setStatus("unsaved");
      } else {
        setStatus("saved");
      }
    } catch {
      saving.current = false;
      setStatus("error");
      timer.current = setTimeout(() => runRef.current(), RETRY_MS);
    }
  }, [id]);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    if (state.revision === savedRevision.current) return;
    if (!saving.current) setStatus((s) => (s === "error" ? s : "unsaved"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, DEBOUNCE_MS);
  }, [state.revision, run]);

  // Leaving the editor inside the app must not drop a save that is still waiting for its timer.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (latest.current.revision !== savedRevision.current && !saving.current) runRef.current();
    },
    [],
  );

  // Warn before leaving with changes that are not saved yet.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latest.current.revision !== savedRevision.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return { status, saveNow: run };
}
