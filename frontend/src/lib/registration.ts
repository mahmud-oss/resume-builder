"use client";

import { useEffect, useState } from "react";

/**
 * Whether new accounts can be created right now. The server decides (ALLOW_REGISTRATION); the website asks, so a
 * "Sign up" or "Get started" button is only shown when it would work. Null means we do not know yet (or could not
 * ask), and nothing about sign-up is promised in that case.
 */
let known: boolean | null = null;
let inFlight: Promise<boolean | null> | null = null;

export function fetchRegistrationOpen(): Promise<boolean | null> {
  if (known !== null) return Promise.resolve(known);
  if (!inFlight) {
    inFlight = fetch("/api/auth/config")
      .then((r) => (r.ok ? (r.json() as Promise<{ registrationOpen?: unknown }>) : null))
      .then((body) => {
        if (body && typeof body.registrationOpen === "boolean") known = body.registrationOpen;
        return known;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useRegistrationOpen(): boolean | null {
  const [open, setOpen] = useState<boolean | null>(known);
  useEffect(() => {
    let alive = true;
    void fetchRegistrationOpen().then((v) => alive && setOpen(v));
    return () => {
      alive = false;
    };
  }, []);
  return open;
}

/** For tests: forget what was learned. */
export function resetRegistrationCache() {
  known = null;
  inFlight = null;
}
