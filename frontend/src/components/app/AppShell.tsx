"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getToken } from "@/lib/api";
import { showsSideNav } from "@/lib/nav";
import { useHydrated } from "@/lib/useHydrated";

import { AppNav } from "./AppNav";

/**
 * Puts the side navigation beside the page for signed-in users on app pages (PRD NAV-01). On a phone the
 * same list is in the header's menu instead. While we are still checking a saved login the column is kept
 * (empty) so the page does not jump sideways when it appears.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const hydrated = useHydrated();

  const eligible = hydrated && showsSideNav(pathname);
  const checking = eligible && !ready && getToken() !== null;
  const visible = eligible && !!user;

  if (!visible && !checking) return <>{children}</>;
  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-3 md:block">
        <div className="sticky top-3">{visible && <AppNav />}</div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
