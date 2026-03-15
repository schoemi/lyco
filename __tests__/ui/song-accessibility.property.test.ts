/**
 * Property 18: ARIA-Labels auf Song-Komponenten
 *
 * Für jedes interaktive Element in der Song-Detail-Ansicht (Buttons, Formularfelder, Links):
 * `aria-label` oder `aria-labelledby` ist vorhanden.
 *
 * **Validates: Requirements 11.5**
 *
 * Approach: Static analysis of TSX source files. We read each song-related component's
 * source code and verify that every interactive element (<button>, <input>, <textarea>, <a>/<Link>)
 * has either aria-label, aria-labelledby, or an associated htmlFor/id label pattern.
 * We use fast-check to randomly sample interactive elements across all components.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const SONG_COMPONENTS = [
  {
    name: "StropheCard",
    filePath: "src/components/songs/strophe-card.tsx",
  },
  {
    name: "SetCard",
    filePath: "src/components/songs/set-card.tsx",
  },
  {
    name: "SongRow",
    filePath: "src/components/songs/song-row.tsx",
  },
  {
    name: "ProgressBar",
    filePath: "src/components/songs/progress-bar.tsx",
  },
  {
    name: "SongDetailPage",
    filePath: "src/app/(main)/songs/[id]/page.tsx",
  },
  {
    name: "SongImportPage",
    filePath: "src/app/(main)/songs/import/page.tsx",
  },
];

/**
 * Extract the opening tag of a JSX element starting at a given position.
 * Handles nested {} expressions (which may contain >) correctly.
 */
function extractJsxOpeningTag(source: string, startIndex: number): string {
  let i = startIndex;
  let braceDepth = 0;

  while (i < source.length) {
    const ch = source[i];
    if (ch === "{") {
      braceDepth++;
    } else if (ch === "}") {
      braceDepth--;
    } else if (braceDepth === 0) {
      if (ch === "/" && source[i + 1] === ">") {
        return source.substring(startIndex, i + 2);
      }
      if (ch === ">") {
        return source.substring(startIndex, i + 1);
      }
    }
    i++;
  }
  return source.substring(startIndex);
}

/**
 * Extract all interactive element tags from TSX source.
 * Matches <button ...>, <input ...>, <textarea ...>, <a ...>, and <Link ...> tags.
 * Handles multi-line JSX with nested {} expressions correctly.
 */
function extractInteractiveTags(source: string): { tag: string; type: string }[] {
  const results: { tag: string; type: string }[] = [];

  const tagNames = ["button", "input", "textarea", "Link", "a"];

  for (const tagName of tagNames) {
    const openRegex = new RegExp(`<${tagName}\\b`, "g");
    let match: RegExpExecArray | null;
    while ((match = openRegex.exec(source)) !== null) {
      const fullTag = extractJsxOpeningTag(source, match.index);
      results.push({ tag: fullTag, type: tagName });
    }
  }

  return results;
}

/**
 * Check if a tag has proper ARIA labeling.
 * A tag is considered properly labeled if it has:
 * - aria-label attribute
 * - aria-labelledby attribute
 * - an id with a corresponding htmlFor label (for inputs/textareas)
 * - role="progressbar" with aria-valuenow (for ProgressBar div)
 */
function hasProperAriaLabeling(tag: string, type: string, source: string): boolean {
  // Direct aria-label or aria-labelledby (string or JSX expression)
  if (/aria-label\s*=/.test(tag) || /aria-labelledby\s*=/.test(tag)) {
    return true;
  }

  // For inputs and textareas: check if there's an id that matches a htmlFor label
  if (type === "input" || type === "textarea") {
    const idMatch = tag.match(/\bid\s*=\s*[{"]([^}"]+)[}"]/);
    if (idMatch) {
      const id = idMatch[1];
      // Check if there's a <label htmlFor="..."> matching this id
      const labelPattern = new RegExp(`htmlFor\\s*=\\s*["']${escapeRegex(id)}["']`);
      if (labelPattern.test(source)) {
        return true;
      }
      // Also check for dynamic id patterns like `note-${strophe.id}`
      // If the id contains a template expression, check for a matching htmlFor pattern
    }
    // Check for dynamic id patterns: id={`something-${...}`}
    const dynamicIdMatch = tag.match(/\bid\s*=\s*\{`([^`]+)`\}/);
    if (dynamicIdMatch) {
      const template = dynamicIdMatch[1];
      // Extract the static prefix before the first ${}
      const prefix = template.split("${")[0];
      if (prefix) {
        const labelPattern = new RegExp(`htmlFor\\s*=\\s*\\{\\s*\`${escapeRegex(prefix)}`);
        if (labelPattern.test(source)) {
          return true;
        }
      }
    }
  }

  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a div has role="progressbar" with proper ARIA attributes.
 */
function extractProgressBarDivs(source: string): { tag: string }[] {
  const results: { tag: string }[] = [];
  const regex = /<div\b[^>]*role\s*=\s*"progressbar"[^>]*?(?:\/>|>)/gs;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    results.push({ tag: match[0] });
  }
  return results;
}

function hasProgressBarAriaAttributes(tag: string): boolean {
  return (
    /aria-valuenow\s*=/.test(tag) &&
    /aria-valuemin\s*=/.test(tag) &&
    /aria-valuemax\s*=/.test(tag)
  );
}

describe("Property 18: ARIA-Labels auf Song-Komponenten", () => {
  // Pre-read all source files and extract interactive elements
  const componentData = SONG_COMPONENTS.map((comp) => {
    const fullPath = path.resolve(process.cwd(), comp.filePath);
    const source = fs.readFileSync(fullPath, "utf-8");
    const interactiveElements = extractInteractiveTags(source);
    const progressBarDivs = extractProgressBarDivs(source);
    return { ...comp, source, interactiveElements, progressBarDivs };
  });

  // Collect all interactive elements across all components
  const allElements: {
    componentName: string;
    filePath: string;
    tag: string;
    type: string;
    source: string;
  }[] = [];

  for (const comp of componentData) {
    for (const el of comp.interactiveElements) {
      allElements.push({
        componentName: comp.name,
        filePath: comp.filePath,
        tag: el.tag,
        type: el.type,
        source: comp.source,
      });
    }
  }

  it("song components contain interactive elements", () => {
    // At least some components should have interactive elements
    expect(allElements.length).toBeGreaterThan(0);
  });

  it("every interactive element (button, input, textarea, link) has aria-label or aria-labelledby", () => {
    // Ensure we have elements to test
    expect(allElements.length).toBeGreaterThan(0);

    const elementArb = fc.constantFrom(...allElements);

    fc.assert(
      fc.property(elementArb, (element) => {
        const result = hasProperAriaLabeling(element.tag, element.type, element.source);
        if (!result) {
          // Provide a helpful error message
          throw new Error(
            `Missing aria-label/aria-labelledby on <${element.type}> in ${element.componentName} (${element.filePath}):\n${element.tag.substring(0, 200)}`
          );
        }
        return true;
      }),
      { numRuns: 20 }
    );
  });

  it("ProgressBar has role='progressbar' with aria-valuenow, aria-valuemin, aria-valuemax", () => {
    const progressBarComp = componentData.find((c) => c.name === "ProgressBar");
    expect(progressBarComp).toBeDefined();
    expect(progressBarComp!.progressBarDivs.length).toBeGreaterThan(0);

    for (const div of progressBarComp!.progressBarDivs) {
      expect(hasProgressBarAriaAttributes(div.tag)).toBe(true);
    }
  });

  it("StropheCard has aria-label on textarea and save button", () => {
    const stropheComp = componentData.find((c) => c.name === "StropheCard");
    expect(stropheComp).toBeDefined();

    const textareas = stropheComp!.interactiveElements.filter((e) => e.type === "textarea");
    const buttons = stropheComp!.interactiveElements.filter((e) => e.type === "button");

    expect(textareas.length).toBeGreaterThan(0);
    expect(buttons.length).toBeGreaterThan(0);

    for (const ta of textareas) {
      expect(
        hasProperAriaLabeling(ta.tag, ta.type, stropheComp!.source),
        `textarea in StropheCard missing aria-label`
      ).toBe(true);
    }

    for (const btn of buttons) {
      expect(
        hasProperAriaLabeling(btn.tag, btn.type, stropheComp!.source),
        `button in StropheCard missing aria-label`
      ).toBe(true);
    }
  });

  it("SetCard has aria-label on expand/collapse button", () => {
    const setComp = componentData.find((c) => c.name === "SetCard");
    expect(setComp).toBeDefined();

    const buttons = setComp!.interactiveElements.filter((e) => e.type === "button");
    expect(buttons.length).toBeGreaterThan(0);

    for (const btn of buttons) {
      expect(
        hasProperAriaLabeling(btn.tag, btn.type, setComp!.source),
        `button in SetCard missing aria-label`
      ).toBe(true);
    }
  });

  it("SongRow Link has aria-label", () => {
    const songRowComp = componentData.find((c) => c.name === "SongRow");
    expect(songRowComp).toBeDefined();

    const links = songRowComp!.interactiveElements.filter(
      (e) => e.type === "Link" || e.type === "a"
    );
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      expect(
        hasProperAriaLabeling(link.tag, link.type, songRowComp!.source),
        `Link in SongRow missing aria-label`
      ).toBe(true);
    }
  });
});
