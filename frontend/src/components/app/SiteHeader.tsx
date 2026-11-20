"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { BRAND } from "@/lib/brand";
import { showsSideNav } from "@/lib/nav";
import { useRegistrationOpen } from "@/lib/registration";
import { useHydrated } from "@/lib/useHydrated";

import { AppNav } from "./AppNav";

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const registrationOpen = useRegistrationOpen();
  // The phone menu is open for one page only: moving to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // The editor has its own toolbar and the print page must stay clean.
  if (pathname.startsWith("/editor") || pathname.startsWith("/print")) return null;
  const signedIn = hydrated && ready && !!user;
  const hasMenu = signedIn && showsSideNav(pathname);
  const menuOpen = hasMenu && openOn === pathname;
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* The sign-in check finishes before this part is hydrated, so wait for hydration before using it. */}
        <Link href={signedIn ? "/dashboard" : "/"} className="font-bold text-brand">
          {BRAND.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {signedIn ? (
            <>
              {hasMenu && (
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="phone-menu"
                  onClick={() => setOpenOn(menuOpen ? null : pathname)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 md:hidden"
                >
                  Menu
                </button>
              )}
              {!hasMenu && (
                <>
                  <Link href="/templates" className="text-slate-600 hover:text-slate-900">
                    Templates
                  </Link>
                  <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                    My resumes
                  </Link>
                </>
              )}
              <button onClick={logout} className="text-slate-600 hover:text-slate-900">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/templates" className="text-slate-600 hover:text-slate-900">
                Templates
              </Link>
              {hydrated && ready && (
                <>
                  <Link href="/login" className="text-slate-600 hover:text-slate-900">
                    Sign in
                  </Link>
                  {/* Only offered while sign-up is open, so the button never leads to a dead end. */}
                  {registrationOpen === true && (
                    <Link href="/register" className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:opacity-90">
                      Sign up
                    </Link>
                  )}
                </>
              )}
            </>
          )}
        </nav>
      </div>
      {menuOpen && (
        <div id="phone-menu" className="border-t border-slate-200 bg-white px-4 py-2 md:hidden">
          <AppNav />
        </div>
      )}
    </header>
  );
}
