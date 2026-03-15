/**
 * Property 13: ARIA-Labels auf Formularfeldern
 *
 * Für jedes Formularfeld in der Auth-UI muss ein `aria-label` oder
 * `aria-labelledby`-Attribut vorhanden sein, das den Zweck des Feldes beschreibt.
 *
 * **Validates: Requirements 6.5**
 *
 * Approach: Static analysis of TSX source files. We read each auth page's source
 * code and verify that every <input element has either aria-label or aria-labelledby.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const AUTH_PAGES = [
  {
    name: "login",
    filePath: "src/app/(auth)/login/page.tsx",
  },
  {
    name: "register",
    filePath: "src/app/(auth)/register/page.tsx",
  },
  {
    name: "setup",
    filePath: "src/app/(auth)/setup/page.tsx",
  },
];

/**
 * Extract all <input ...> tags from TSX source (handles multi-line JSX).
 * Returns an array of the full input tag strings.
 */
function extractInputTags(source: string): string[] {
  const tags: string[] = [];
  // Match <input followed by props until /> or > (self-closing or not)
  const regex = /<input\b[^>]*?\/?>/gs;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    tags.push(match[0]);
  }
  return tags;
}

/**
 * Check if an input tag string contains aria-label or aria-labelledby.
 */
function hasAriaLabel(inputTag: string): boolean {
  return /aria-label\s*=/.test(inputTag) || /aria-labelledby\s*=/.test(inputTag);
}

describe("Property 13: ARIA-Labels auf Formularfeldern", () => {
  // Pre-read all source files
  const pageContents = AUTH_PAGES.map((page) => {
    const fullPath = path.resolve(process.cwd(), page.filePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const inputs = extractInputTags(source);
    return { ...page, source, inputs };
  });

  it("every auth page has at least one input field", () => {
    for (const page of pageContents) {
      expect(
        page.inputs.length,
        `${page.name} page should have at least one <input> field`
      ).toBeGreaterThan(0);
    }
  });

  it("every <input> in auth pages has aria-label or aria-labelledby", () => {
    // Build an arbitrary that picks a page and an input index from that page
    const authPageInputArb = fc.constantFrom(...pageContents).chain((page) =>
      fc.record({
        pageName: fc.constant(page.name),
        filePath: fc.constant(page.filePath),
        inputIndex: fc.nat({ max: page.inputs.length - 1 }),
        inputTag: fc.constant(page.inputs),
      })
    );

    fc.assert(
      fc.property(authPageInputArb, ({ pageName, filePath, inputIndex, inputTag }) => {
        const tag = inputTag[inputIndex];
        const result = hasAriaLabel(tag);
        if (!result) {
          return false;
        }
        return true;
      }),
      { numRuns: 20 }
    );
  });
});
