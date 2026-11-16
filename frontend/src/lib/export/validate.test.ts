import { describe, expect, it } from "vitest";

import { contentDisposition, fileNameFromDisposition, parseExportRequest, pdfFileName } from "./validate";

const doc = (over: Record<string, unknown> = {}) => ({
  doc: { title: "My CV", templateId: "classic", data: { basics: {}, sections: [] }, design: {}, ...over },
});

describe("export request", () => {
  it("accepts a CV and repairs it like the editor does", () => {
    const r = parseExportRequest(doc({ templateId: "no-such-template", design: { font: "comic-sans" }, data: { basics: {} } }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.templateId).toBe("classic");
      expect(r.doc.design.font).not.toBe("comic-sans");
      expect(r.doc.data.sections.length).toBeGreaterThan(0);
    }
  });

  it("refuses anything that is not a CV", () => {
    for (const bad of [null, "x", 5, [], {}, { doc: null }, { doc: "x" }]) {
      const r = parseExportRequest(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
    expect(parseExportRequest(doc({ title: 5 })).ok).toBe(false);
    expect(parseExportRequest(doc({ templateId: undefined })).ok).toBe(false);
    expect(parseExportRequest(doc({ data: null })).ok).toBe(false);
    expect(parseExportRequest(doc({ title: "x".repeat(201) })).ok).toBe(false);
  });
});

describe("download file name", () => {
  it("uses the title and ends in .pdf", () => {
    expect(pdfFileName("Rahim Uddin")).toBe("Rahim Uddin.pdf");
  });

  it("removes characters that are not allowed in file names", () => {
    expect(pdfFileName('a/b\\c:d*e?f"g<h>i|j')).toBe("abcdefghij.pdf");
    expect(pdfFileName("line\nbreak\u0000")).toBe("linebreak.pdf");
  });

  it("falls back to Resume, and never starts with a dot or runs on", () => {
    expect(pdfFileName("")).toBe("Resume.pdf");
    expect(pdfFileName("   ")).toBe("Resume.pdf");
    expect(pdfFileName("///")).toBe("Resume.pdf");
    expect(pdfFileName("..hidden")).toBe("hidden.pdf");
    expect(pdfFileName("a".repeat(300)).length).toBeLessThanOrEqual(84);
  });

  it("keeps Bangla and other languages in the real name and gives a plain fallback", () => {
    const name = pdfFileName("রহিম উদ্দিন CV");
    const header = contentDisposition(name);
    expect(header).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
    expect(fileNameFromDisposition(header)).toBe(name);
  });

  it("round-trips a normal name and survives a quote in it", () => {
    expect(fileNameFromDisposition(contentDisposition("Rahim Uddin.pdf"))).toBe("Rahim Uddin.pdf");
    expect(contentDisposition('he said "hi".pdf')).not.toMatch(/filename="[^"]*"[^;]*"/);
    expect(fileNameFromDisposition(null)).toBeNull();
    expect(fileNameFromDisposition("attachment")).toBeNull();
  });
});
