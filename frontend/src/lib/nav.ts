/**
 * The app's side navigation (PRD NAV-01). One list drives the desktop sidebar and the phone menu.
 * Flip `ready` to true when a page exists; until then the entry shows as "Soon" and is not a link.
 */

export type NavItem = {
  href: string;
  label: string;
  /** Shows the Pro badge: a feature that will be paid later (PAY-10). */
  pro?: boolean;
  /** False while the page is not built yet. */
  ready: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "My resumes", ready: true },
  { href: "/upload", label: "Upload CV", pro: true, ready: true },
  { href: "/ats-checker", label: "ATS checker", ready: true },
  { href: "/job-match", label: "Job match", pro: true, ready: false },
  { href: "/tailor", label: "Tailor my resume", pro: true, ready: false },
  { href: "/templates", label: "Templates", ready: true },
];

/** Pages that get the side navigation for a signed-in user. The editor and print page stay full screen. */
export function showsSideNav(pathname: string): boolean {
  return NAV_ITEMS.some((item) => isActive(pathname, item.href));
}

/** "/templates/modern" counts as being on "/templates". */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
