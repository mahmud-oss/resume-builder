"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { ctaFor } from "@/lib/landing";
import { useRegistrationOpen } from "@/lib/registration";
import { useHydrated } from "@/lib/useHydrated";

/** The landing page's buttons. They depend on who is looking and on whether sign-up is open, so they are decided in the browser. */
export function HeroActions({ center = false }: { center?: boolean }) {
  const { user, ready } = useAuth();
  const hydrated = useHydrated();
  const registrationOpen = useRegistrationOpen();
  const signedIn = hydrated && ready && !!user;
  // Until we know who is looking, show the safe choice only.
  const c = ctaFor({ signedIn, registrationOpen: hydrated && ready ? registrationOpen : null });
  return (
    <div className={center ? "text-center" : ""}>
      <div className={`flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>
        <Link href={c.primary.href} className="rounded-md bg-brand px-5 py-3 text-base font-semibold text-white hover:opacity-90">
          {c.primary.label}
        </Link>
        {c.secondary && (
          <Link href={c.secondary.href} className="rounded-md border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-800 hover:bg-slate-50">
            {c.secondary.label}
          </Link>
        )}
      </div>
      {c.note && <p className="mt-3 text-sm text-slate-500">{c.note}</p>}
    </div>
  );
}
