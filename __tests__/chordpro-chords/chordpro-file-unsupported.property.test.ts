/**
 * Property 5: ChordPro-Datei ignoriert nicht unterstützte Direktiven
 *
 * Für alle ChordPro-Dateien, die nicht unterstützte Direktiven enthalten
 * (Akkorddiagramme, Tabs, Grids, ABC-Notation, Lilypond), soll der Parser
 * diese Direktiven ignorieren, ohne Fehler zu erzeugen. Die resultierenden
 * Sektionen und Zeilen sollen nur den unterstützten Inhalt enthalten.
 *
 * **Validates: Requirements 5.8, 12.1, 12.2, 12.3, 12.4**
 */
// Feature: chordpro-chords, Property 5: ChordPro-Datei ignoriert nicht unterstützte Direktiven

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordProFile } from "@/lib/chords/chordpro-file-parser";

// --- Types ---

type SectionType = "verse" | "chorus" | "bridge";

interface GeneratedSection {
  type: SectionType;
  lines: string[];
}

type UnsupportedDirective =
  | { kind: "define"; value: string }
  | { kind: "chord"; value: string }
  | { kind: "tab"; content: string[] }
  | { kind: "grid"; content: string[] }
  | { kind: "abc"; content: string[] }
  | { kind: "ly"; content: string[] };

// --- Generators ---

const sectionType: fc.Arbitrary<SectionType> = fc.constantFrom(
  "verse",
  "chorus",
  "bridge",
);

// Content line: non-empty, no curly braces or square brackets
const contentLine = fc
  .stringMatching(/^[a-zA-Z0-9 ,.'!?äöüÄÖÜß]{1,40}$/)
  .filter((s) => s.trim().length > 0);

// Chord name for lines with chords
const rootNote = fc.constantFrom(
  "A", "B", "C", "D", "E", "F", "G",
  "Am", "Bm", "Cm", "Dm", "Em", "Fm", "Gm",
);

const chordQuality = fc.constantFrom("", "7", "maj7", "m7", "sus4");

const chordName = fc
  .tuple(rootNote, chordQuality)
  .map(([root, qual]) => `${root}${qual}`);

// A line optionally with chords
const lineWithOptionalChords = fc.oneof(
  contentLine,
  fc
    .tuple(chordName, contentLine)
    .map(([chord, text]) => `[${chord}]${text}`),
);

// --- Unsupported directive generators ---

// {define: ...} — chord diagram definitions
const defineDirective: fc.Arbitrary<UnsupportedDirective> = fc
  .constantFrom(
    "Am base-fret 1 frets x 0 2 2 1 0",
    "G base-fret 1 frets 3 2 0 0 0 3",
    "Cmaj7 base-fret 1 frets x 3 2 0 0 0",
    "D frets x x 0 2 3 2",
  )
  .map((value) => ({ kind: "define", value }));

// {chord: ...} — chord definitions
const chordDirective: fc.Arbitrary<UnsupportedDirective> = fc
  .constantFrom(
    "Am",
    "G7",
    "Cmaj7 base-fret 3 frets 1 1 3 3 3 1",
    "Dsus4",
  )
  .map((value) => ({ kind: "chord", value }));

// {start_of_tab} ... {end_of_tab} — tab blocks
const tabBlock: fc.Arbitrary<UnsupportedDirective> = fc
  .array(
    fc.constantFrom(
      "e|---0---1---3---|",
      "B|---1---1---0---|",
      "G|---2---0---0---|",
      "D|---2---2---0---|",
      "A|---0---3---2---|",
      "E|---x---x---3---|",
    ),
    { minLength: 1, maxLength: 6 },
  )
  .map((content) => ({ kind: "tab", content }));

// {start_of_grid} ... {end_of_grid} — grid blocks
const gridBlock: fc.Arbitrary<UnsupportedDirective> = fc
  .array(
    fc.constantFrom(
      "| Am . . . | G . . . |",
      "| C . . . | F . . . |",
      "| Dm . G . | C . . . |",
    ),
    { minLength: 1, maxLength: 4 },
  )
  .map((content) => ({ kind: "grid", content }));

// {start_of_abc} ... {end_of_abc} — ABC notation blocks
const abcBlock: fc.Arbitrary<UnsupportedDirective> = fc
  .array(
    fc.constantFrom(
      "X:1",
      "T:Example",
      "M:4/4",
      "K:C",
      "CDEF GABc|",
      "cBAG FEDC|",
    ),
    { minLength: 1, maxLength: 4 },
  )
  .map((content) => ({ kind: "abc", content }));

// {start_of_ly} ... {end_of_ly} — Lilypond blocks
const lyBlock: fc.Arbitrary<UnsupportedDirective> = fc
  .array(
    fc.constantFrom(
      "\\relative c' {",
      "  c4 d e f |",
      "  g2 g |",
      "}",
    ),
    { minLength: 1, maxLength: 4 },
  )
  .map((content) => ({ kind: "ly", content }));

// Any unsupported directive
const unsupportedDirective: fc.Arbitrary<UnsupportedDirective> = fc.oneof(
  defineDirective,
  chordDirective,
  tabBlock,
  gridBlock,
  abcBlock,
  lyBlock,
);

// --- Section generator ---

const sectionGen: fc.Arbitrary<GeneratedSection> = fc
  .tuple(
    sectionType,
    fc.array(lineWithOptionalChords, { minLength: 1, maxLength: 4 }),
  )
  .map(([type, lines]) => ({ type, lines }));

// --- Helpers ---

const SECTION_START: Record<SectionType, string> = {
  verse: "start_of_verse",
  chorus: "start_of_chorus",
  bridge: "start_of_bridge",
};

const SECTION_END: Record<SectionType, string> = {
  verse: "end_of_verse",
  chorus: "end_of_chorus",
  bridge: "end_of_bridge",
};

function renderUnsupportedDirective(dir: UnsupportedDirective): string[] {
  switch (dir.kind) {
    case "define":
      return [`{define: ${dir.value}}`];
    case "chord":
      return [`{chord: ${dir.value}}`];
    case "tab":
      return ["{start_of_tab}", ...dir.content, "{end_of_tab}"];
    case "grid":
      return ["{start_of_grid}", ...dir.content, "{end_of_grid}"];
    case "abc":
      return ["{start_of_abc}", ...dir.content, "{end_of_abc}"];
    case "ly":
      return ["{start_of_ly}", ...dir.content, "{end_of_ly}"];
  }
}

/**
 * Placement strategy for unsupported directives:
 * - "before": before all sections
 * - "between": between sections
 * - "after": after all sections
 * - "inside": inside a section (between content lines)
 */
type Placement = "before" | "between" | "after" | "inside";

const placementGen: fc.Arbitrary<Placement> = fc.constantFrom(
  "before",
  "between",
  "after",
  "inside",
);

interface TestInput {
  sections: GeneratedSection[];
  directives: UnsupportedDirective[];
  placements: Placement[];
}

// Generate a file with 1-3 supported sections and 1-4 unsupported directives
const testInputGen: fc.Arbitrary<TestInput> = fc
  .tuple(
    fc.array(sectionGen, { minLength: 1, maxLength: 3 }),
    fc.array(
      fc.tuple(unsupportedDirective, placementGen),
      { minLength: 1, maxLength: 4 },
    ),
  )
  .map(([sections, dirPlacements]) => ({
    sections,
    directives: dirPlacements.map(([d]) => d),
    placements: dirPlacements.map(([, p]) => p),
  }));

function buildChordProFile(input: TestInput): string {
  const beforeLines: string[] = [];
  const betweenLines: string[][] = [];
  const afterLines: string[] = [];
  const insideInjections: Map<number, string[]> = new Map();

  // Initialize between-section slots
  for (let i = 0; i < input.sections.length - 1; i++) {
    betweenLines.push([]);
  }

  // Distribute unsupported directives according to their placement
  for (let i = 0; i < input.directives.length; i++) {
    const dir = input.directives[i];
    const placement = input.placements[i];
    const rendered = renderUnsupportedDirective(dir);

    switch (placement) {
      case "before":
        beforeLines.push(...rendered);
        break;
      case "between":
        if (betweenLines.length > 0) {
          const slot = i % betweenLines.length;
          betweenLines[slot].push(...rendered);
        } else {
          // Only one section — place before instead
          beforeLines.push(...rendered);
        }
        break;
      case "after":
        afterLines.push(...rendered);
        break;
      case "inside": {
        // Inject inside a section (the directive lines go between content lines)
        const sectionIdx = i % input.sections.length;
        if (!insideInjections.has(sectionIdx)) {
          insideInjections.set(sectionIdx, []);
        }
        insideInjections.get(sectionIdx)!.push(...rendered);
        break;
      }
    }
  }

  // Build the file
  const fileLines: string[] = [...beforeLines];

  for (let s = 0; s < input.sections.length; s++) {
    const section = input.sections[s];
    fileLines.push(`{${SECTION_START[section.type]}}`);

    const injected = insideInjections.get(s) ?? [];
    // Insert injected directives after the first content line
    for (let l = 0; l < section.lines.length; l++) {
      fileLines.push(section.lines[l]);
      if (l === 0 && injected.length > 0) {
        fileLines.push(...injected);
      }
    }

    fileLines.push(`{${SECTION_END[section.type]}}`);

    // Add between-section directives
    if (s < betweenLines.length) {
      fileLines.push(...betweenLines[s]);
    }
  }

  fileLines.push(...afterLines);

  return fileLines.join("\n");
}

// --- Property Tests ---

describe("Property 5: ChordPro-Datei ignoriert nicht unterstützte Direktiven", () => {
  it("parser ignores unsupported directives without errors and preserves supported content", () => {
    fc.assert(
      fc.property(testInputGen, (input) => {
        const fileContent = buildChordProFile(input);
        const result = parseChordProFile(fileContent);

        // 1. No errors should be produced
        expect(result.errors).toHaveLength(0);

        // 2. The number of parsed sections should match the supported sections
        expect(result.sections).toHaveLength(input.sections.length);

        // 3. Each section should have the correct type
        for (let s = 0; s < input.sections.length; s++) {
          const expected = input.sections[s];
          const actual = result.sections[s];

          expect(actual.type).toBe(expected.type);

          // 4. Section lines should contain only the supported content lines
          //    (unsupported block content and directives should not appear)
          for (const line of actual.lines) {
            // No unsupported directive syntax should leak into section lines
            expect(line).not.toMatch(/^\{define:/);
            expect(line).not.toMatch(/^\{chord:/);
            expect(line).not.toMatch(/^\{start_of_tab\}/);
            expect(line).not.toMatch(/^\{end_of_tab\}/);
            expect(line).not.toMatch(/^\{start_of_grid\}/);
            expect(line).not.toMatch(/^\{end_of_grid\}/);
            expect(line).not.toMatch(/^\{start_of_abc\}/);
            expect(line).not.toMatch(/^\{end_of_abc\}/);
            expect(line).not.toMatch(/^\{start_of_ly\}/);
            expect(line).not.toMatch(/^\{end_of_ly\}/);
          }

          // 5. All original supported content lines should be present
          for (const expectedLine of expected.lines) {
            expect(actual.lines).toContain(expectedLine);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("parser ignores tab block content entirely — no tab lines leak into output", () => {
    fc.assert(
      fc.property(
        fc.tuple(sectionGen, tabBlock),
        ([section, tab]) => {
          const fileContent = [
            `{${SECTION_START[section.type]}}`,
            section.lines[0],
            ...renderUnsupportedDirective(tab),
            ...section.lines.slice(1),
            `{${SECTION_END[section.type]}}`,
          ].join("\n");

          const result = parseChordProFile(fileContent);

          expect(result.errors).toHaveLength(0);
          expect(result.sections).toHaveLength(1);

          // Tab content lines (e.g. "e|---0---1---|") must not appear
          for (const tabLine of tab.content) {
            expect(result.sections[0].lines).not.toContain(tabLine);
          }

          // Supported lines must still be present
          for (const line of section.lines) {
            expect(result.sections[0].lines).toContain(line);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("parser ignores grid block content entirely — no grid lines leak into output", () => {
    fc.assert(
      fc.property(
        fc.tuple(sectionGen, gridBlock),
        ([section, grid]) => {
          const fileContent = [
            `{${SECTION_START[section.type]}}`,
            section.lines[0],
            ...renderUnsupportedDirective(grid),
            ...section.lines.slice(1),
            `{${SECTION_END[section.type]}}`,
          ].join("\n");

          const result = parseChordProFile(fileContent);

          expect(result.errors).toHaveLength(0);
          expect(result.sections).toHaveLength(1);

          // Grid content lines must not appear
          for (const gridLine of grid.content) {
            expect(result.sections[0].lines).not.toContain(gridLine);
          }

          // Supported lines must still be present
          for (const line of section.lines) {
            expect(result.sections[0].lines).toContain(line);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
