/** The buttons on the landing page, and what they say, depending on who is looking and whether sign-up is open. */

export type Cta = { label: string; href: string };
export type Ctas = { primary: Cta; secondary: Cta | null; note: string | null };

export function ctaFor(s: { signedIn: boolean; registrationOpen: boolean | null }): Ctas {
  if (s.signedIn) {
    return {
      primary: { label: "Go to my resumes", href: "/dashboard" },
      secondary: { label: "Check my CV for ATS", href: "/ats-checker" },
      note: null,
    };
  }
  const templates: Cta = { label: "Browse templates", href: "/templates" };
  if (s.registrationOpen === true) {
    return { primary: { label: "Get started free", href: "/register" }, secondary: templates, note: null };
  }
  if (s.registrationOpen === false) {
    return {
      primary: { label: "Sign in", href: "/login" },
      secondary: templates,
      note: "Sign-ups are closed during early access.",
    };
  }
  // Not known yet: promise nothing about signing up.
  return { primary: templates, secondary: null, note: null };
}
