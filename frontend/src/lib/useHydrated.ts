import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False on the server and during hydration, true afterwards. Avoids hydration mismatches for client-only UI. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
