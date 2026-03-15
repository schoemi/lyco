/**
 * Property 5: ARIA-Attribute auf Emotional-Lernen-Komponenten
 *
 * Für jede Strophe in der Emotional-Lernen-Ansicht gilt:
 * - Die Modus-Tabs müssen `role="tablist"` und `role="tab"` mit korrektem `aria-selected`-Attribut besitzen.
 * - Jeder „Alle aufdecken"-Button muss ein `aria-label` mit dem Strophen-Namen enthalten.
 * - Verborgene Übersetzungszeilen müssen `aria-hidden` haben.
 * - Alle Textfelder (Interpretation, Notiz) müssen korrekte `aria-label`-Attribute besitzen.
 *
 * **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
 *
 * Approach: Static analysis of TSX source files. We read each emotional-learning component's
 * source code and verify that the required ARIA attributes are present.
 * We use fast-check to randomly sample checks across all components.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

// --- Helper: extract JSX opening tag handling nested {} ---
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

// --- Component definitions ---
const EMOTIONAL_COMPONENTS = [
  { name: "ModeTabs", filePath: "src/components/emotional/mode-tabs.tsx" },
  { name: "StropheCard", filePath: "src/components/emotional/strophe-card.tsx" },
  { name: "RevealLine", filePath: "src/components/emotional/reveal-line.tsx" },
  { name: "InterpretationTab", filePath: "src/components/emotional/interpretation-tab.tsx" },
  { name: "NotesTab", filePath: "src/components/emotional/notes-tab.tsx" },
];

// Pre-read all source files
const componentSources: Record<string, string> = {};
for (const comp of EMOTIONAL_COMPONENTS) {
  const fullPath = path.resolve(process.cwd(), comp.filePath);
  componentSources[comp.name] = fs.readFileSync(fullPath, "utf-8");
}

// --- ARIA check definitions ---
interface AriaCheck {
  id: string;
  component: string;
  description: string;
  validate: (source: string) => boolean;
}

const ARIA_CHECKS: AriaCheck[] = [
  // Requirement 11.2: ModeTabs – role="tablist"
  {
    id: "modeTabs-tablist",
    component: "ModeTabs",
    description: 'ModeTabs has role="tablist" on container',
    validate: (source) => /role\s*=\s*"tablist"/.test(source),
  },
  // Requirement 11.2: ModeTabs – role="tab"
  {
    id: "modeTabs-tab-role",
    component: "ModeTabs",
    description: 'ModeTabs has role="tab" on tab buttons',
    validate: (source) => /role\s*=\s*"tab"/.test(source),
  },
  // Requirement 11.2: ModeTabs – aria-selected
  {
    id: "modeTabs-aria-selected",
    component: "ModeTabs",
    description: "ModeTabs has aria-selected attribute on tab buttons",
    validate: (source) => /aria-selected\s*=/.test(source),
  },
  // Requirement 11.3: StropheCard – "Alle aufdecken" button has aria-label with strophe name
  {
    id: "stropheCard-reveal-all-aria-label",
    component: "StropheCard",
    description: '"Alle aufdecken" button has aria-label containing strophe name',
    validate: (source) => {
      // Find button tags in the source
      const buttonRegex = /<button\b/g;
      let match: RegExpExecArray | null;
      while ((match = buttonRegex.exec(source)) !== null) {
        const tag = extractJsxOpeningTag(source, match.index);
        // Check if this is the "Alle aufdecken" button (contains that text nearby)
        if (tag.includes("aria-label") && /strophe\.name/.test(tag)) {
          return true;
        }
      }
      return false;
    },
  },
  // Requirement 11.4: RevealLine – aria-hidden on translation span
  {
    id: "revealLine-aria-hidden",
    component: "RevealLine",
    description: "RevealLine has aria-hidden on translation content",
    validate: (source) => /aria-hidden\s*=/.test(source),
  },
  // Requirement 11.5: InterpretationTab – textarea has aria-label
  {
    id: "interpretationTab-textarea-aria-label",
    component: "InterpretationTab",
    description: "InterpretationTab textarea has aria-label",
    validate: (source) => {
      const textareaRegex = /<textarea\b/g;
      let match: RegExpExecArray | null;
      while ((match = textareaRegex.exec(source)) !== null) {
        const tag = extractJsxOpeningTag(source, match.index);
        if (/aria-label\s*=/.test(tag)) {
          return true;
        }
      }
      return false;
    },
  },
  // Requirement 11.5: NotesTab – textarea has aria-label
  {
    id: "notesTab-textarea-aria-label",
    component: "NotesTab",
    description: "NotesTab textarea has aria-label",
    validate: (source) => {
      const textareaRegex = /<textarea\b/g;
      let match: RegExpExecArray | null;
      while ((match = textareaRegex.exec(source)) !== null) {
        const tag = extractJsxOpeningTag(source, match.index);
        if (/aria-label\s*=/.test(tag)) {
          return true;
        }
      }
      return false;
    },
  },
];

describe("Property 5: ARIA-Attribute auf Emotional-Lernen-Komponenten", () => {
  it("all emotional-learning components contain required ARIA attributes", () => {
    const checkArb = fc.constantFrom(...ARIA_CHECKS);

    fc.assert(
      fc.property(checkArb, (check) => {
        const source = componentSources[check.component];
        const result = check.validate(source);
        if (!result) {
          throw new Error(
            `ARIA check failed: ${check.description} (${check.id}) in ${check.component}`
          );
        }
        return true;
      }),
      { numRuns: 20 }
    );
  });

  it("ModeTabs has role='tablist' on container div", () => {
    const source = componentSources["ModeTabs"];
    expect(source).toMatch(/role\s*=\s*"tablist"/);
  });

  it("ModeTabs has role='tab' and aria-selected on each tab button", () => {
    const source = componentSources["ModeTabs"];
    expect(source).toMatch(/role\s*=\s*"tab"/);
    expect(source).toMatch(/aria-selected\s*=/);
  });

  it("StropheCard 'Alle aufdecken' button has aria-label with strophe name", () => {
    const source = componentSources["StropheCard"];
    // The button should have aria-label referencing strophe.name
    expect(source).toMatch(/aria-label\s*=\s*\{?\s*`[^`]*\$\{strophe\.name\}[^`]*`/);
  });

  it("RevealLine has aria-hidden on translation content", () => {
    const source = componentSources["RevealLine"];
    expect(source).toMatch(/aria-hidden\s*=/);
  });

  it("InterpretationTab textarea has aria-label", () => {
    const source = componentSources["InterpretationTab"];
    // Find textarea and verify it has aria-label
    const textareaRegex = /<textarea\b/g;
    const match = textareaRegex.exec(source);
    expect(match).not.toBeNull();
    const tag = extractJsxOpeningTag(source, match!.index);
    expect(tag).toMatch(/aria-label\s*=/);
  });

  it("NotesTab textarea has aria-label", () => {
    const source = componentSources["NotesTab"];
    const textareaRegex = /<textarea\b/g;
    const match = textareaRegex.exec(source);
    expect(match).not.toBeNull();
    const tag = extractJsxOpeningTag(source, match!.index);
    expect(tag).toMatch(/aria-label\s*=/);
  });
});
