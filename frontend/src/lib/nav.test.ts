import { describe, expect, it } from "vitest";

import { isActive, NAV_ITEMS, showsSideNav } from "./nav";

describe("side navigation", () => {
  it("lists the destinations the PRD names, in order", () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual([
      "My resumes",
      "Upload CV",
      "ATS checker",
      "Job match",
      "Tailor my resume",
      "Templates",
    ]);
  });

  it("marks the AI features that will be paid as Pro, and only those", () => {
    expect(NAV_ITEMS.filter((i) => i.pro).map((i) => i.label)).toEqual(["Upload CV", "Job match", "Tailor my resume"]);
  });

  it("only links pages that exist", () => {
    expect(NAV_ITEMS.filter((i) => i.ready).map((i) => i.href)).toEqual(["/dashboard", "/upload", "/ats-checker", "/job-match", "/templates"]);
  });

  it("uses unique addresses", () => {
    expect(new Set(NAV_ITEMS.map((i) => i.href)).size).toBe(NAV_ITEMS.length);
  });
});

describe("isActive", () => {
  it("matches the page itself and pages below it", () => {
    expect(isActive("/templates", "/templates")).toBe(true);
    expect(isActive("/templates/modern", "/templates")).toBe(true);
  });

  it("does not match a different page that only starts with the same letters", () => {
    expect(isActive("/templates-old", "/templates")).toBe(false);
    expect(isActive("/dashboard", "/templates")).toBe(false);
  });
});

describe("showsSideNav", () => {
  it("is on for app pages, including ones not built yet", () => {
    for (const p of ["/dashboard", "/upload", "/templates", "/templates/classic", "/ats-checker", "/job-match", "/tailor"]) {
      expect(showsSideNav(p)).toBe(true);
    }
  });

  it("is off for the editor, the print page, sign-in and the home redirect", () => {
    for (const p of ["/editor/abc", "/print", "/login", "/register", "/", "/new"]) expect(showsSideNav(p)).toBe(false);
  });
});
