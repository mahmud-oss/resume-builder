"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { BRAND } from "@/lib/brand";
import { useHydrated } from "@/lib/useHydrated";

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const hydrated = useHydrated();
  // The editor has its own toolbar and the print page must stay clean.
  if (pathname.startsWith("/editor") || pathname.startsWith("/print")) return null;
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="font-bold text-brand">
          {BRAND.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/templates" className="text-slate-600 hover:text-slate-900">
            Templates
          </Link>
          {hydrated && ready && user ? (
            <>
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                My resumes
              </Link>
              <button onClick={logout} className="text-slate-600 hover:text-slate-900">
                Sign out
              </button>
            </>
          ) : hydrated && ready ? (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Sign in
              </Link>
              <Link href="/register" className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:opacity-90">
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
