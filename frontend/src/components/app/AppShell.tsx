import { Suspense, type ReactNode } from "react";

import { SideColumn } from "./SideColumn";

/**
 * Puts the side navigation beside the page. The page content is rendered here, outside the Suspense
 * boundary, so it is never held back by the navigation (which has to read the current address).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <Suspense fallback={null}>
        <SideColumn />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
