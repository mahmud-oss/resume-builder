"use client";

import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { getToken } from "@/lib/api";
import { showsSideNav } from "@/lib/nav";
import { useHydrated } from "@/lib/useHydrated";

import { AppNav } from "./AppNav";

/**
 * The side navigation for signed-in users on app pages (PRD NAV-01). It reads the current address, which is
 * only known at request time, so AppShell wraps it in Suspense and the page itself never waits for it.
 * While a saved login is still being checked an empty column is kept so the page does not jump sideways.
 */
export function SideColumn() {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const hydrated = useHydrated();

  const eligible = hydrated && showsSideNav(pathname);
  const checking = eligible && !ready && getToken() !== null;
  const visible = eligible && !!user;
  if (!visible && !checking) return null;

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-3 md:block">
      <div className="sticky top-3">{visible && <AppNav />}</div>
    </aside>
  );
}
