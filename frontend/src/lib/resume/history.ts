import type { ResumeDoc } from "./types";
import type { Mutation } from "./mutations";

/**
 * Undo/redo history. Typing fires an edit per keystroke, so edits that share a `coalesceKey`
 * and arrive close together are merged into one undo step.
 */

const MAX_HISTORY = 100;
const COALESCE_WINDOW_MS = 1000;

export type HistoryState = {
  present: ResumeDoc;
  past: ResumeDoc[];
  future: ResumeDoc[];
  lastKey: string | null;
  lastAt: number;
  /** Increases on every real change, so autosave knows there is something new to save. */
  revision: number;
};

export type HistoryAction =
  | { type: "mutate"; mutation: Mutation; coalesceKey?: string; at: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; doc: ResumeDoc };

export function initHistory(doc: ResumeDoc): HistoryState {
  return { present: doc, past: [], future: [], lastKey: null, lastAt: 0, revision: 0 };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "mutate": {
      const next = action.mutation(state.present);
      if (next === state.present) return state;
      const merge =
        action.coalesceKey !== undefined &&
        action.coalesceKey === state.lastKey &&
        action.at - state.lastAt < COALESCE_WINDOW_MS;
      return {
        present: next,
        past: merge ? state.past : [...state.past, state.present].slice(-MAX_HISTORY),
        future: [],
        lastKey: action.coalesceKey ?? null,
        lastAt: action.at,
        revision: state.revision + 1,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
        revision: state.revision + 1,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        present: next,
        past: [...state.past, state.present],
        future: rest,
        lastKey: null,
        lastAt: 0,
        revision: state.revision + 1,
      };
    }
    case "reset":
      return initHistory(action.doc);
  }
}
