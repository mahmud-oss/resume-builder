/**
 * Splits a column of blocks across pages. Each block is measured in the browser, then placed
 * greedily: a block goes on the current page if it fits, otherwise it starts the next page.
 * A block is never cut in half.
 */

export type PaginateBlock = {
  /** Measured height in pixels. */
  height: number;
  /** Force this block to start a new page (manual page break). */
  breakBefore?: boolean;
};

/**
 * Returns the page index (0-based) for each block.
 * `available(page)` is the usable height of that page.
 */
export function paginate(blocks: PaginateBlock[], available: (page: number) => number): number[] {
  const pages: number[] = [];
  let page = 0;
  let used = 0;

  for (const block of blocks) {
    if (block.breakBefore && used > 0) {
      page += 1;
      used = 0;
    } else if (used > 0 && used + block.height > available(page)) {
      page += 1;
      used = 0;
    }
    pages.push(page);
    used += block.height;
  }
  return pages;
}

/** Number of pages needed by a set of per-block page indexes (at least one). */
export function pageCount(...assignments: number[][]): number {
  let max = 0;
  for (const a of assignments) for (const p of a) max = Math.max(max, p);
  return max + 1;
}
