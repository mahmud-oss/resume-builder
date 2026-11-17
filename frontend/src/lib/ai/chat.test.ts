import { describe, expect, it } from "vitest";

import { newDoc } from "../resume/doc";
import { addCustomField, addSection, applyEdit } from "../resume/mutations";
import { draftMutation, currentText, planUpdates } from "./apply";
import { buildRequest, pendingDrafts, regenerateText, assistantMessage, START_TEXT } from "./chat";
import { buildSnapshot, resolveEntry, resolveSection } from "./snapshot";
import { emptyTopics, mergeTopics, topicOrder, topicStatus } from "./topics";
import type { AiUpdate, ChatMessage, ChatResponse } from "./types";

const upd = (over: Partial<AiUpdate>): AiUpdate => ({ action: "set_basics", section: "", entry: "", field: "", value: "", values: [], ...over });

function expSection(doc: ReturnType<typeof newDoc>) {
  return doc.data.sections.find((s) => s.type === "experience")!;
}

describe("the CV as the assistant sees it", () => {
  it("lists every contact field, never the photo, and gives sections and entries short references", () => {
    let doc = newDoc();
    doc = applyEdit({ kind: "basics", field: "fullName" }, "Rahim")(doc);
    doc = { ...doc, data: { ...doc.data, basics: { ...doc.data.basics, photo: "data:image/png;base64,AAAA" } } };
    const snap = buildSnapshot(doc) as { basics: Record<string, string>; sections: { ref: string; entries: { ref: string }[] }[] };
    expect(snap.basics.fullName).toBe("Rahim");
    expect(Object.keys(snap.basics)).toEqual(expect.arrayContaining(["fullName", "headline", "email", "phone", "location", "website", "linkedin"]));
    expect(JSON.stringify(snap)).not.toContain("base64");
    expect(snap.sections.map((s) => s.ref)).toContain("experience");
    expect(snap.sections.find((s) => s.ref === "experience")!.entries[0].ref).toBe("experience.1");
  });

  it("numbers a second section of the same kind and skips hidden sections and entries", () => {
    let doc = addSection("custom", "c1")(newDoc());
    doc = addSection("custom", "c2")(doc);
    const refs = (buildSnapshot(doc).sections as { ref: string }[]).map((s) => s.ref);
    expect(refs).toContain("custom");
    expect(refs).toContain("custom.2");
    const hiddenDoc = { ...doc, data: { ...doc.data, sections: doc.data.sections.map((s) => (s.type === "projects" ? { ...s, hidden: true } : s)) } };
    expect((buildSnapshot(hiddenDoc).sections as { type: string }[]).map((s) => s.type)).not.toContain("projects");
  });

  it("includes the user's own contact details", () => {
    let doc = addCustomField({ kind: "basics" }, "x")(newDoc());
    doc = applyEdit({ kind: "basicsCustom", id: "x" }, "Nationality: Bangladeshi")(doc);
    expect(buildSnapshot(doc).customDetails).toEqual(["Nationality: Bangladeshi"]);
  });

  it("resolves references back to real ids, and refuses ones that are not there", () => {
    const doc = newDoc();
    const exp = expSection(doc);
    expect(resolveSection(doc, "experience")).toBe(exp.id);
    expect(resolveEntry(doc, "experience.1")).toEqual({ sectionId: exp.id, itemId: exp.items[0].id });
    expect(resolveEntry(doc, "experience.2")).toBeNull();
    expect(resolveEntry(doc, "nonsense")).toBeNull();
    expect(resolveEntry(doc, "experience.0")).toBeNull();
    expect(resolveSection(doc, "nope")).toBeNull();
  });
});

describe("applying what the assistant says", () => {
  it("sets contact details and fields of an entry", () => {
    const doc = newDoc();
    const plan = planUpdates(doc, [
      upd({ field: "fullName", value: "Rahim Uddin" }),
      upd({ action: "set_field", entry: "experience.1", field: "role", value: "Clerk" }),
    ]);
    const next = plan.mutation(doc);
    expect(next.data.basics.values.fullName).toBe("Rahim Uddin");
    expect(expSection(next).items[0].values.role).toBe("Clerk");
    expect(plan.notes).toEqual(["Full name", "Job title"]);
    expect(plan.rejected).toEqual([]);
  });

  it("skips anything that does not exist instead of guessing, and says so", () => {
    const doc = newDoc();
    const plan = planUpdates(doc, [
      upd({ field: "shoeSize", value: "42" }),
      upd({ action: "set_field", entry: "experience.9", field: "role", value: "x" }),
      upd({ action: "set_field", entry: "experience.1", field: "nonsense", value: "x" }),
      upd({ action: "add_section", section: "astrology" }),
    ]);
    expect(plan.mutation(doc)).toBe(doc);
    expect(plan.rejected).toHaveLength(4);
    expect(plan.notes).toEqual([]);
  });

  it("fills the blank first entry before adding another", () => {
    const doc = newDoc();
    const first = planUpdates(doc, [upd({ action: "add_entry", section: "experience", values: [{ field: "role", value: "Clerk" }, { field: "company", value: "Acme" }] })]).mutation(doc);
    expect(expSection(first).items).toHaveLength(1);
    expect(expSection(first).items[0].values).toMatchObject({ role: "Clerk", company: "Acme" });
    const second = planUpdates(first, [upd({ action: "add_entry", section: "experience", values: [{ field: "role", value: "Intern" }] })]).mutation(first);
    expect(expSection(second).items.map((i) => i.values.role)).toEqual(["Clerk", "Intern"]);
  });

  it("ignores values for fields the section does not have", () => {
    const doc = newDoc();
    const next = planUpdates(doc, [upd({ action: "add_entry", section: "experience", values: [{ field: "role", value: "Clerk" }, { field: "bogus", value: "x" }] })]).mutation(doc);
    expect(JSON.stringify(expSection(next).items[0].values)).not.toContain("bogus");
  });

  it("lets a later update use an entry an earlier update added", () => {
    let doc = newDoc();
    doc = planUpdates(doc, [upd({ action: "add_entry", section: "experience", values: [{ field: "role", value: "Clerk" }] })]).mutation(doc);
    const plan = planUpdates(doc, [
      upd({ action: "add_entry", section: "experience", values: [{ field: "role", value: "Intern" }] }),
      upd({ action: "set_field", entry: "experience.2", field: "company", value: "Beta" }),
    ]);
    expect(expSection(plan.mutation(doc)).items[1].values).toMatchObject({ role: "Intern", company: "Beta" });
  });

  it("adds a section once, but allows several custom sections", () => {
    const doc = newDoc();
    const once = planUpdates(doc, [upd({ action: "add_section", section: "certifications" })]).mutation(doc);
    expect(once.data.sections.filter((s) => s.type === "certifications")).toHaveLength(1);
    const again = planUpdates(once, [upd({ action: "add_section", section: "certifications" })]);
    expect(again.mutation(once)).toBe(once);
    expect(again.rejected).toHaveLength(1);
    const customs = planUpdates(once, [upd({ action: "add_section", section: "custom" }), upd({ action: "add_section", section: "custom" })]).mutation(once);
    expect(customs.data.sections.filter((s) => s.type === "custom")).toHaveLength(2);
  });

  it("is one change for undo, and still works if the CV changed in the meantime", () => {
    const doc = newDoc();
    const plan = planUpdates(doc, [upd({ field: "fullName", value: "Rahim" }), upd({ field: "email", value: "r@example.com" })]);
    const edited = applyEdit({ kind: "basics", field: "phone" }, "0171")(doc);
    const next = plan.mutation(edited);
    expect(next.data.basics.values).toMatchObject({ fullName: "Rahim", email: "r@example.com", phone: "0171" });
  });
});

describe("drafts", () => {
  it("accepting puts the text in the field it was written for", () => {
    const doc = newDoc();
    const m = draftMutation(doc, { entry: "experience.1", field: "description" }, "Kept the ledgers.\nTrained two juniors.");
    expect(m).not.toBeNull();
    expect(expSection(m!(doc)).items[0].values.description).toBe("Kept the ledgers.\nTrained two juniors.");
  });

  it("is refused when the entry or field is gone", () => {
    const doc = newDoc();
    expect(draftMutation(doc, { entry: "experience.5", field: "description" }, "x")).toBeNull();
    expect(draftMutation(doc, { entry: "experience.1", field: "nope" }, "x")).toBeNull();
  });

  it("reports the text it would replace", () => {
    let doc = newDoc();
    expect(currentText(doc, { entry: "experience.1", field: "description" })).toBe("");
    const exp = expSection(doc);
    doc = applyEdit({ kind: "item", sectionId: exp.id, itemId: exp.items[0].id, field: "description" }, "Old text")(doc);
    expect(currentText(doc, { entry: "experience.1", field: "description" })).toBe("Old text");
  });

  it("a regenerate request carries the draft text and the feedback", () => {
    const draft = { id: "d1", entry: "experience.1", field: "description", text: "Did things.", warnings: [], status: "pending" as const };
    const text = regenerateText(draft, "shorter");
    expect(text).toContain("Please write it again: shorter.");
    expect(text).toContain("Did things.");
    expect(text).toContain("experience.1");
    expect(regenerateText(draft, "  ")).toContain("differently");
  });
});

describe("the topic checklist", () => {
  it("follows the sections the CV has, summary last", () => {
    const doc = newDoc();
    const order = topicOrder(doc);
    expect(order[0]).toBe("basics");
    expect(order.at(-1)).toBe("summary");
    expect(order).toEqual(expect.arrayContaining(["experience", "education", "skills"]));
    const without = { ...doc, data: { ...doc.data, sections: doc.data.sections.filter((s) => s.type !== "projects") } };
    expect(topicOrder(without)).not.toContain("projects");
  });

  it("keeps what was done, never lists a topic as both done and skipped, and ignores unknown topics", () => {
    const doc = newDoc();
    let state = emptyTopics(doc);
    state = mergeTopics(state, doc, { current: "experience", completed: ["basics", "made-up"], skipped: [] });
    expect(state.completed).toEqual(["basics"]);
    state = mergeTopics(state, doc, { current: "education", completed: ["experience"], skipped: ["projects"] });
    expect(state.completed).toEqual(["basics", "experience"]);
    expect(state.skipped).toEqual(["projects"]);
    state = mergeTopics(state, doc, { current: "projects", completed: ["projects"], skipped: [] });
    expect(state.skipped).toEqual([]);
    expect(state.completed).toContain("projects");
    expect(topicStatus(state, "basics")).toBe("done");
    expect(topicStatus(state, "education")).toBe("open");
    expect(topicStatus(state, "projects")).toBe("done");
  });

  it("a skipped topic stops being skipped once the user goes back to it", () => {
    const doc = newDoc();
    let state = mergeTopics(emptyTopics(doc), doc, { current: "education", completed: [], skipped: ["projects"] });
    expect(state.skipped).toEqual(["projects"]);
    state = mergeTopics(state, doc, { current: "projects", completed: [], skipped: [] });
    expect(state.skipped).toEqual([]);
    expect(topicStatus(state, "projects")).toBe("current");
  });

  it("marks the current topic, and an empty current topic means all done", () => {
    const doc = newDoc();
    const state = mergeTopics(emptyTopics(doc), doc, { current: "education", completed: [], skipped: [] });
    expect(topicStatus(state, "education")).toBe("current");
    expect(mergeTopics(state, doc, { current: "", completed: [], skipped: [] }).current).toBe("");
  });
});

describe("building the request", () => {
  const msg = (role: "user" | "assistant", content: string): ChatMessage => ({ id: content, role, content });

  it("sends the CV and topics, and only the latest 40 messages starting with a user message", () => {
    const doc = newDoc();
    const many: ChatMessage[] = [];
    for (let i = 0; i < 60; i++) many.push(msg(i % 2 === 0 ? "user" : "assistant", `m${i}`));
    const body = buildRequest(many, doc, emptyTopics(doc));
    expect(body.messages.length).toBeLessThanOrEqual(40);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages.at(-1)!.content).toBe("m59");
    expect(body.cv).toHaveProperty("basics");
    expect(body.topics.order[0]).toBe("basics");
  });

  it("tells the assistant which drafts are still waiting, newest per field, and none that were decided", () => {
    const draft = (id: string, text: string, status: "pending" | "accepted" | "replaced", field = "description") => ({ id, entry: "experience.1", field, text, warnings: [], status });
    const withDrafts = (...drafts: ReturnType<typeof draft>[]): ChatMessage => ({ id: drafts[0].id, role: "assistant", content: "x", drafts });
    expect(pendingDrafts([withDrafts(draft("a", "First", "pending"))])).toEqual([{ entry: "experience.1", field: "description", text: "First" }]);
    // redone: the old one is replaced, only the new one is waiting
    expect(pendingDrafts([withDrafts(draft("a", "First", "replaced")), withDrafts(draft("b", "Second", "pending"))])).toEqual([{ entry: "experience.1", field: "description", text: "Second" }]);
    // accepted: nothing waiting
    expect(pendingDrafts([withDrafts(draft("a", "First", "accepted"))])).toEqual([]);
    // two fields at once
    expect(pendingDrafts([withDrafts(draft("a", "X", "pending"), draft("b", "Y", "pending", "details"))])).toHaveLength(2);
    expect(pendingDrafts([])).toEqual([]);
    expect(buildRequest([], newDoc(), emptyTopics(newDoc())).pendingDrafts).toEqual([]);
  });

  it("turns a server reply into a message with drafts waiting and replies to tap", () => {
    const response: ChatResponse = {
      message: "Here is a draft",
      updates: [],
      drafts: [{ id: "d1", entry: "experience.1", field: "description", text: "x", warnings: [] }],
      currentTopic: "experience",
      completedTopics: [],
      skippedTopics: [],
      suggestedReplies: ["Skip"],
      demo: true,
    };
    const m = assistantMessage(response, ["Job title"]);
    expect(m.role).toBe("assistant");
    expect(m.drafts?.[0].status).toBe("pending");
    expect(m.suggestedReplies).toEqual(["Skip"]);
    expect(m.notes).toEqual(["Job title"]);
    expect(assistantMessage({ ...response, drafts: [], suggestedReplies: [] }, []).drafts).toBeUndefined();
    expect(START_TEXT).toBeTruthy();
  });
});
