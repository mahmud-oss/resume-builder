"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, NAV_ITEMS } from "@/lib/nav";

import { ProBadge } from "./ProBadge";

/** The list of destinations, used by the desktop sidebar and the phone menu. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const base = "flex items-center gap-2 rounded-md px-3 py-2 text-sm";
          if (!item.ready) {
            return (
              <li key={item.href}>
                <span aria-disabled="true" title="Coming soon" className={`${base} cursor-not-allowed text-slate-400`}>
                  {item.label}
                  <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium uppercase leading-4 text-slate-500">
                    Soon
                  </span>
                </span>
              </li>
            );
          }
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${base} ${active ? "bg-blue-50 font-medium text-brand" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {item.label}
                {item.pro && <ProBadge />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
