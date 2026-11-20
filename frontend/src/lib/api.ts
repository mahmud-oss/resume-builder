/**
 * Talks to the backend. Requests go to /api/... on this site and Next forwards them to the
 * Java server (see next.config.ts).
 *
 * The login token is kept in localStorage for now. That is simple but a script injected into
 * the page could read it; before a real launch it should move to an httpOnly cookie.
 */

const TOKEN_KEY = "rb.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the user will simply have to sign in again */
  }
}

type Listener = () => void;
const unauthorisedListeners = new Set<Listener>();
export function onUnauthorised(fn: Listener) {
  unauthorisedListeners.add(fn);
  return () => void unauthorisedListeners.delete(fn);
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; keepalive?: boolean } = {}): Promise<T> {
  const token = getToken();
  // A file upload sends a FormData as it is; the browser adds the multipart header itself.
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
      keepalive: init.keepalive,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }

  if (res.status === 401 && token) {
    // The token expired or was rejected.
    setToken(null);
    unauthorisedListeners.forEach((fn) => fn());
  }
  if (!res.ok) {
    let message = `Something went wrong (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
      else if (typeof body?.error === "string") message = body.error;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- typed endpoints ---------------------------------------------------------------------

export type User = { id: string; email: string; name: string | null };
export type AuthResponse = { token: string; user: User };
export type ResumeSummary = { id: string; title: string; templateId: string; updatedAt: string };
export type ServerResume = ResumeSummary & { data: unknown; design: unknown; createdAt: string };

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api<AuthResponse>("/auth/register", { method: "POST", body: { email, password, name: name || null } }),
  login: (email: string, password: string) =>
    api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }),
  me: () => api<User>("/me"),
};

export const resumeApi = {
  list: () => api<ResumeSummary[]>("/resumes"),
  get: (id: string) => api<ServerResume>(`/resumes/${id}`),
  create: (body: { title?: string; templateId: string; data?: unknown; design?: unknown }) =>
    api<ServerResume>("/resumes", { method: "POST", body }),
  update: (id: string, body: { title: string; templateId: string; data: unknown; design: unknown }) =>
    api<ServerResume>(`/resumes/${id}`, { method: "PUT", body }),
  remove: (id: string) => api<void>(`/resumes/${id}`, { method: "DELETE" }),
};

// --- the AI assistant ----------------------------------------------------------------------------

import type { AiStatus, ChatResponse } from "@/lib/ai/types";
import type { ChatRequestBody } from "@/lib/ai/chat";
import type { UploadResponse } from "@/lib/upload/convert";
import type { AtsFileResponse, ReviewResponse } from "@/lib/ats/types";
import type { Snapshot } from "@/lib/ai/snapshot";

export const aiApi = {
  status: () => api<AiStatus>("/ai/status"),
  chat: (body: ChatRequestBody) => api<ChatResponse>("/ai/chat", { method: "POST", body }),
  /** A PDF or Word file; the server reads it and returns the CV's content as fields. */
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<UploadResponse>("/ai/upload", { method: "POST", body: form });
  },
  /** ATS checker, uploaded file: what is wrong with the file itself, plus the CV read from it. */
  atsFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<AtsFileResponse>("/ai/ats-file", { method: "POST", body: form });
  },
  /** Feedback on the CV's wording. `cv` is the compact snapshot the chat also uses. */
  writingReview: (cv: Snapshot) => api<ReviewResponse>("/ai/writing-review", { method: "POST", body: { cv } }),
};
