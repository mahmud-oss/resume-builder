"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./AuthProvider";

/** Shows its children only to signed-in users; everyone else is sent to the login page and brought back after. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return <div className="p-10 text-slate-500">Loading…</div>;
  return <>{children}</>;
}
