/**
 * Preservation Property Test — Unaffected Test Assertions Remain Passing
 *
 * This test verifies that all test assertions NOT affected by the refactoring
 * continue to pass on unfixed code. It uses fc.constantFrom over tuples of
 * (testFile, assertionDescription, assertionCheck) to systematically verify
 * each unaffected assertion.
 *
 * Categories verified:
 * 1. Pure function tests: shouldShowSongInfo behavior
 * 2. Accessibility attributes: aria-label, aria-busy, min touch targets
 * 3. Component wiring: SongDeleteDialog props, SongEditForm/StropheEditor imports
 * 4. Completion logic: completionFired ref, score checks, API call patterns
 * 5. Source patterns that still match: sortedStrophen.map, handleDeselectAll, validation
 *
 * EXPECTED: All tests PASS on unfixed code (confirms baseline behavior to preserve).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";
import { shouldShowSongInfo } from "@/app/stage/[songId]/page";

// ─── Load source files ───────────────────────────────────────────────────────

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

const translateButtonSource = readSource("src/components/songs/translate-button.tsx");
const songDetailSource = readSource("src/app/(main)/songs/[id]/page.tsx");
const clozePageSource = readSource("src/app/(main)/songs/[id]/cloze/page.tsx");
const strophenDialogSource = readSource("src/components/cloze/strophen-auswahl-dialog.tsx");

// ─── Preservation assertion tuples ───────────────────────────────────────────

type PreservationCase = {
  testFile: string;
  description: string;
  check: () => void;
};

const preservationCases: PreservationCase[] = [
  // ── 1. Pure function tests: shouldShowSongInfo (Req 3.1) ──────────────────

  {
    testFile: "song-info-overlay.test.ts",
    description: "shouldShowSongInfo returns true when songId differs from prevSongId",
    check: () => {
      expect(shouldShowSongInfo("song-2", "song-1")).toBe(true);
    },
  },
  {
    testFile: "song-info-overlay.test.ts",
    description: "shouldShowSongInfo returns false when songId equals prevSongId",
    check: () => {
      expect(shouldShowSongInfo("song-1", "song-1")).toBe(false);
    },
  },
  {
    testFile: "song-info-overlay.test.ts",
    description: "shouldShowSongInfo returns true when prevSongId is null",
    check: () => {
      expect(shouldShowSongInfo("song-1", null)).toBe(true);
    },
  },

  // ── 2. Accessibility attributes in translate-button (Req 3.3) ─────────────

  {
    testFile: "translate-button.test.ts",
    description: 'aria-label="Songtext übersetzen" present in translate-button',
    check: () => {
      expect(translateButtonSource).toContain('aria-label="Songtext übersetzen"');
    },
  },
  {
    testFile: "translate-button.test.ts",
    description: "aria-busy={translating} present in translate-button",
    check: () => {
      expect(translateButtonSource).toContain("aria-busy={translating}");
    },
  },
  {
    testFile: "translate-button.test.ts",
    description: "min-h-[44px] touch target in translate-button",
    check: () => {
      expect(translateButtonSource).toContain("min-h-[44px]");
    },
  },
  {
    testFile: "translate-button.test.ts",
    description: "min-w-[44px] touch target in translate-button",
    check: () => {
      expect(translateButtonSource).toContain("min-w-[44px]");
    },
  },

  // ── 3. Component wiring in song detail page (Req 3.2, 3.4) ────────────────

  {
    testFile: "page-integration.test.ts",
    description: "SongDeleteDialog rendered with open={deleteDialogOpen}",
    check: () => {
      expect(songDetailSource).toContain("<SongDeleteDialog");
      expect(songDetailSource).toContain("open={deleteDialogOpen}");
    },
  },
  {
    testFile: "page-integration.test.ts",
    description: "SongDeleteDialog rendered with song={song}",
    check: () => {
      expect(songDetailSource).toContain("song={song}");
    },
  },
  {
    testFile: "page-integration.test.ts",
    description: "SongDeleteDialog rendered with onClose callback",
    check: () => {
      expect(songDetailSource).toContain("onClose={");
    },
  },
  {
    testFile: "page-integration.test.ts",
    description: "SongDeleteDialog rendered with onDeleted callback",
    check: () => {
      expect(songDetailSource).toContain("onDeleted={");
    },
  },
  {
    testFile: "page-integration.test.ts",
    description: "SongEditForm imported in song detail page",
    check: () => {
      expect(songDetailSource).toContain("import SongEditForm");
      expect(songDetailSource).toContain("song-edit-form");
    },
  },
  {
    testFile: "page-integration.test.ts",
    description: "StropheEditor imported in song detail page",
    check: () => {
      expect(songDetailSource).toContain("import StropheEditor");
      expect(songDetailSource).toContain("strophe-editor");
    },
  },

  // ── 4. Completion logic in cloze page (Req 3.5) ───────────────────────────

  {
    testFile: "completion.test.ts",
    description: "completionFired ref with useRef(false)",
    check: () => {
      expect(clozePageSource).toContain("completionFired");
      expect(clozePageSource).toMatch(/useRef\s*\(\s*false\s*\)/);
    },
  },
  {
    testFile: "completion.test.ts",
    description: "score.correct/score.total comparison for completion detection",
    check: () => {
      expect(clozePageSource).toMatch(/score\.correct\s*(<|>=)\s*score\.total/);
    },
  },
  {
    testFile: "completion.test.ts",
    description: "score.total === 0 guard against false completion",
    check: () => {
      expect(clozePageSource).toMatch(/score\.total\s*===\s*0/);
    },
  },
  {
    testFile: "completion.test.ts",
    description: "PUT /api/progress call pattern",
    check: () => {
      expect(clozePageSource).toContain("/api/progress");
      expect(clozePageSource).toMatch(/method:\s*"PUT"/);
    },
  },
  {
    testFile: "completion.test.ts",
    description: "POST /api/sessions with LUECKENTEXT",
    check: () => {
      expect(clozePageSource).toContain("/api/sessions");
      expect(clozePageSource).toMatch(/method:\s*"POST"/);
      expect(clozePageSource).toContain("LUECKENTEXT");
    },
  },
  {
    testFile: "completion.test.ts",
    description: "completionFired.current checked before API calls",
    check: () => {
      expect(clozePageSource).toMatch(/completionFired\.current/);
    },
  },
  {
    testFile: "completion.test.ts",
    description: "completionFired.current = true set before persisting",
    check: () => {
      expect(clozePageSource).toContain("completionFired.current = true");
    },
  },
  {
    testFile: "completion.test.ts",
    description: "completionFired.current = false reset on difficulty change",
    check: () => {
      expect(clozePageSource).toContain("completionFired.current = false");
    },
  },

  // ── 5. Source patterns that still match (Req 3.1, 3.2) ────────────────────

  {
    testFile: "dialog-strophe-order.property.test.ts",
    description: "sortedStrophen.map still used for rendering in strophen-auswahl-dialog",
    check: () => {
      expect(strophenDialogSource).toContain("sortedStrophen.map");
    },
  },
  {
    testFile: "select-all-none.property.test.ts",
    description: "handleDeselectAll sets localSelection to empty set",
    check: () => {
      expect(strophenDialogSource).toMatch(
        /handleDeselectAll[\s\S]*?setLocalSelection\(new Set\(\)\)/,
      );
    },
  },
  {
    testFile: "select-all-none.property.test.ts",
    description: "validation error pattern: localSelection.size === 0",
    check: () => {
      expect(strophenDialogSource).toContain("localSelection.size === 0");
      expect(strophenDialogSource).toContain(
        "Mindestens eine Strophe muss ausgewählt sein",
      );
    },
  },
];

// ─── Property-based test ─────────────────────────────────────────────────────

describe("Preservation Property — Unaffected Test Assertions Remain Passing", () => {
  it("all unaffected assertions pass on unfixed code", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...preservationCases),
        (preservationCase) => {
          preservationCase.check();
        },
      ),
      { numRuns: 200 },
    );
  });

  // ── Category 1: Pure function tests (Req 3.1) ─────────────────────────────

  describe("Pure function tests — shouldShowSongInfo", () => {
    it("returns true when songId differs from prevSongId", () => {
      expect(shouldShowSongInfo("song-2", "song-1")).toBe(true);
    });

    it("returns false when songId equals prevSongId", () => {
      expect(shouldShowSongInfo("song-1", "song-1")).toBe(false);
    });

    it("returns true when prevSongId is null", () => {
      expect(shouldShowSongInfo("song-1", null)).toBe(true);
    });
  });

  // ── Category 2: Accessibility attributes (Req 3.3) ────────────────────────

  describe("Accessibility attributes — translate-button", () => {
    it('has aria-label="Songtext übersetzen"', () => {
      expect(translateButtonSource).toContain('aria-label="Songtext übersetzen"');
    });

    it("has aria-busy={translating}", () => {
      expect(translateButtonSource).toContain("aria-busy={translating}");
    });

    it("has min-h-[44px] touch target", () => {
      expect(translateButtonSource).toContain("min-h-[44px]");
    });

    it("has min-w-[44px] touch target", () => {
      expect(translateButtonSource).toContain("min-w-[44px]");
    });
  });

  // ── Category 3: Component wiring (Req 3.2, 3.4) ───────────────────────────

  describe("Component wiring — song detail page", () => {
    it("SongDeleteDialog has open, song, onClose, onDeleted props", () => {
      expect(songDetailSource).toContain("<SongDeleteDialog");
      expect(songDetailSource).toContain("open={deleteDialogOpen}");
      expect(songDetailSource).toContain("song={song}");
      expect(songDetailSource).toContain("onClose={");
      expect(songDetailSource).toContain("onDeleted={");
    });

    it("imports SongEditForm and StropheEditor", () => {
      expect(songDetailSource).toContain("import SongEditForm");
      expect(songDetailSource).toContain("song-edit-form");
      expect(songDetailSource).toContain("import StropheEditor");
      expect(songDetailSource).toContain("strophe-editor");
    });
  });

  // ── Category 4: Completion logic (Req 3.5) ────────────────────────────────

  describe("Completion logic — cloze page", () => {
    it("uses completionFired ref to prevent duplicate API calls", () => {
      expect(clozePageSource).toContain("completionFired");
      expect(clozePageSource).toMatch(/useRef\s*\(\s*false\s*\)/);
    });

    it("checks score.correct vs score.total for completion", () => {
      expect(clozePageSource).toMatch(/score\.correct\s*(<|>=)\s*score\.total/);
    });

    it("guards against zero total", () => {
      expect(clozePageSource).toMatch(/score\.total\s*===\s*0/);
    });

    it("calls PUT /api/progress and POST /api/sessions", () => {
      expect(clozePageSource).toContain("/api/progress");
      expect(clozePageSource).toMatch(/method:\s*"PUT"/);
      expect(clozePageSource).toContain("/api/sessions");
      expect(clozePageSource).toMatch(/method:\s*"POST"/);
      expect(clozePageSource).toContain("LUECKENTEXT");
    });
  });

  // ── Category 5: Source patterns that still match (Req 3.1) ─────────────────

  describe("Source patterns that still match", () => {
    it("sortedStrophen.map still used for rendering in strophen-auswahl-dialog", () => {
      expect(strophenDialogSource).toContain("sortedStrophen.map");
    });

    it("handleDeselectAll sets localSelection to empty set", () => {
      expect(strophenDialogSource).toMatch(
        /handleDeselectAll[\s\S]*?setLocalSelection\(new Set\(\)\)/,
      );
    });

    it("validation error pattern present", () => {
      expect(strophenDialogSource).toContain("localSelection.size === 0");
      expect(strophenDialogSource).toContain(
        "Mindestens eine Strophe muss ausgewählt sein",
      );
    });
  });
});
