import { afterEach, describe, expect, it, vi } from "vitest";

import { ctaFor } from "./landing";
import { fetchRegistrationOpen, resetRegistrationCache } from "./registration";

describe("ctaFor", () => {
  it("sends a signed-in user to their resumes", () => {
    const c = ctaFor({ signedIn: true, registrationOpen: false });
    expect(c.primary).toEqual({ label: "Go to my resumes", href: "/dashboard" });
    expect(c.secondary?.href).toBe("/ats-checker");
    expect(c.note).toBeNull();
  });

  it("offers sign-up only when it is open", () => {
    const open = ctaFor({ signedIn: false, registrationOpen: true });
    expect(open.primary).toEqual({ label: "Get started free", href: "/register" });
    expect(open.note).toBeNull();
    const closed = ctaFor({ signedIn: false, registrationOpen: false });
    expect(closed.primary.href).toBe("/login");
    expect(JSON.stringify(closed)).not.toContain("/register");
    expect(closed.note).toMatch(/closed/);
  });

  it("promises nothing about sign-up while it is not known", () => {
    const c = ctaFor({ signedIn: false, registrationOpen: null });
    expect(JSON.stringify(c)).not.toMatch(/register|Get started|Sign in/);
    expect(c.primary.href).toBe("/templates");
    expect(c.secondary).toBeNull();
  });

  it("always lets a visitor browse the templates", () => {
    for (const registrationOpen of [true, false, null]) {
      const c = ctaFor({ signedIn: false, registrationOpen });
      expect([c.primary, c.secondary].some((x) => x?.href === "/templates")).toBe(true);
    }
  });
});

describe("fetchRegistrationOpen", () => {
  afterEach(() => {
    resetRegistrationCache();
    vi.unstubAllGlobals();
  });

  const reply = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });

  it("reads the server's answer, and asks only once", async () => {
    const fetchMock = reply({ registrationOpen: false });
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRegistrationOpen()).toBe(false);
    expect(await fetchRegistrationOpen()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/config");
  });

  it("reads an open answer too", async () => {
    vi.stubGlobal("fetch", reply({ registrationOpen: true }));
    expect(await fetchRegistrationOpen()).toBe(true);
  });

  it("stays unknown when the server cannot be reached or answers badly, and tries again next time", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchRegistrationOpen()).toBeNull();
    vi.stubGlobal("fetch", reply({}, false));
    expect(await fetchRegistrationOpen()).toBeNull();
    vi.stubGlobal("fetch", reply({ registrationOpen: "yes" }));
    expect(await fetchRegistrationOpen()).toBeNull();
    vi.stubGlobal("fetch", reply({ registrationOpen: true }));
    expect(await fetchRegistrationOpen()).toBe(true); // a failure was not remembered
  });
});
