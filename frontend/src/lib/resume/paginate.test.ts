import { describe, expect, it } from "vitest";

import { pageCount, paginate } from "./paginate";

const fixed = (h: number) => () => h;

describe("paginate", () => {
  it("keeps everything on one page when it fits", () => {
    expect(paginate([{ height: 100 }, { height: 200 }, { height: 300 }], fixed(1000))).toEqual([0, 0, 0]);
  });

  it("moves a block that does not fit to the next page, without splitting it", () => {
    expect(paginate([{ height: 600 }, { height: 600 }, { height: 300 }], fixed(1000))).toEqual([0, 1, 1]);
  });

  it("fills a page exactly", () => {
    expect(paginate([{ height: 500 }, { height: 500 }, { height: 1 }], fixed(1000))).toEqual([0, 0, 1]);
  });

  it("honours a manual page break, but not at the very top of a page", () => {
    expect(paginate([{ height: 100 }, { height: 100, breakBefore: true }], fixed(1000))).toEqual([0, 1]);
    expect(paginate([{ height: 100, breakBefore: true }, { height: 100 }], fixed(1000))).toEqual([0, 0]);
  });

  it("does not create an empty page for a block taller than a page", () => {
    // Too tall to fit anywhere, but it still gets a page of its own and later blocks follow it.
    expect(paginate([{ height: 2000 }, { height: 100 }], fixed(1000))).toEqual([0, 1]);
  });

  it("lets a later page have a different usable height", () => {
    const available = (page: number) => (page === 0 ? 500 : 1000);
    expect(paginate([{ height: 400 }, { height: 400 }, { height: 400 }], available)).toEqual([0, 1, 1]);
  });

  it("handles no blocks", () => {
    expect(paginate([], fixed(1000))).toEqual([]);
    expect(pageCount([])).toBe(1);
  });

  it("counts pages across several columns", () => {
    expect(pageCount([0, 0], [0, 1, 2])).toBe(3);
  });
});
