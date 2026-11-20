"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import { useRegistrationOpen } from "@/lib/registration";

import { useAuth } from "./AuthProvider";

/** Only allow redirects to pages on this site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const registrationOpen = useRegistrationOpen();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLogin && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (isLogin) await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Email or password is incorrect."
          : err instanceof ApiError && err.status === 409
            ? "An account with this email already exists. Try signing in."
            : err instanceof Error
              ? err.message
              : "Something went wrong.",
      );
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
  const other = `${isLogin ? "/register" : "/login"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (!isLogin && registrationOpen === false) {
    return (
      <main className="mx-auto w-full max-w-sm px-4 py-14">
        <h1 className="text-2xl font-bold">Sign-ups are closed</h1>
        <p className="mt-3 text-slate-600">
          We are in early access and are not creating new accounts right now. If you already have an account you can sign in.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/templates" className="font-medium text-brand hover:underline">
            Browse templates
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-14">
      <h1 className="text-2xl font-bold">{isLogin ? "Sign in" : "Create your account"}</h1>
      <form method="post" onSubmit={submit} className="mt-6 space-y-4">
        {!isLogin && (
          <label className="block text-sm font-medium">
            Name <span className="font-normal text-slate-500">(optional)</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            className={input}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
          {!isLogin && <span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span>}
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        {isLogin && registrationOpen === false ? (
          "Sign-ups are closed during early access."
        ) : isLogin && registrationOpen === null ? null : (
          <>
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <Link href={other} className="font-medium text-brand hover:underline">
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
