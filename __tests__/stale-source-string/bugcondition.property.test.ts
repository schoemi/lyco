/**
 * Bug Condition Exploration Test — Stale Source-String Assertions
 *
 * This test demonstrates that the bug exists across all seven affected test files.
 * For each affected case, it:
 *   1. Reads the CURRENT test file source
 *   2. Reads the CURRENT production source file
 *   3. Verifies that the OLD assertion pattern in the test file does NOT match
 *      the current production source — confirming the test is stale.
 *
 * The test uses fc.constantFrom over tuples of (testFile, description, verifyFn)
 * to systematically check each bug condition.
 *
 * EXPECTED: This test PASSES on unfixed code, confirming the bug exists
 * (the old test patterns don't match the new production code).
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

// ─── Load all affected test file sources ─────────────────────────────────────

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

// Production sources
const clozePage = readSource("src/app/(main)/songs/[id]/cloze/page.tsx");
const strophenDialog = readSource("src/components/cloze/strophen-auswahl-dialog.tsx");
const stagePage = readSource("src/app/stage/[songId]/page.tsx");
const translateButton = readSource("src/components/songs/translate-button.tsx");
const songDetailPage = readSource("src/app/(main)/songs/[id]/page.tsx");
const dashboardPage = readSource("src/app/(main)/dashboard/page.tsx");

// Test file sources
const completionTest = readSource("__tests__/cloze/completion.test.ts");
const dialogOrderTest = readSource("__tests__/cloze/dialog-strophe-order.property.test.ts");
const selectAllTest = readSource("__tests__/cloze/select-all-none.property.test.ts");
const displayModeTest = readSource("__tests__/stage/display-mode.property.test.ts");
const songInfoTest = readSource("__tests__/stage/song-info-overlay.test.ts");
const translateTest = readSource("__tests__/songs/translate-button.test.ts");
const pageIntegrationTest = readSource("__tests__/songs/page-integration.test.ts");

// ─── Bug condition cases ─────────────────────────────────────────────────────

type BugCase = {
  testFile: string;
  description: string;
  sourceFile: string;
  /**
   * Returns true when the bug condition is confirmed:
   * the old test assertion pattern does NOT match the current production source.
   */
  verify: () => boolean;
};

const bugCases: BugCase[] = [
  {
    testFile: "completion.test.ts",
    description:
      "Old regex for strophe iteration (song.*strophen) does not match production code (strophenToUpdate)",
    sourceFile: "src/app/(main)/songs/[id]/cloze/page.tsx",
    verify: () => {
      // The OLD regex from the test file
      const oldRegex = /for\s*\(\s*(const|let|var)\s+\w+\s+of\s+song.*strophen\s*\)/;
      // The NEW expected regex
      const newRegex = /for\s*\(\s*const\s+strophe\s+of\s+strophenToUpdate\s*\)/;

      // Bug condition: old pattern does NOT match production, new pattern DOES
      const oldMatches = oldRegex.test(clozePage);
      const newMatches = newRegex.test(clozePage);

      return !oldMatches && newMatches;
    },
  },
  {
    testFile: "dialog-strophe-order.property.test.ts",
    description:
      "Old sorting regex ([...strophen].sort) does not match production code ([...lernbareStrophen].sort)",
    sourceFile: "src/components/cloze/strophen-auswahl-dialog.tsx",
    verify: () => {
      const oldRegex =
        /sortedStrophen\s*=\s*\[\.\.\.strophen\]\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\.orderIndex\s*-\s*b\.orderIndex/;
      const newRegex =
        /sortedStrophen\s*=\s*\[\.\.\.lernbareStrophen\]\.sort\(/;

      const oldMatches = oldRegex.test(strophenDialog);
      const newMatches = newRegex.test(strophenDialog);

      return !oldMatches && newMatches;
    },
  },
  {
    testFile: "select-all-none.property.test.ts",
    description:
      "Old handleSelectAll regex (strophen.map) does not match production code (lernbareStrophen.map)",
    sourceFile: "src/components/cloze/strophen-auswahl-dialog.tsx",
    verify: () => {
      const oldRegex =
        /handleSelectAll[\s\S]*?setLocalSelection\(new Set\(strophen\.map\(\(?s\)?\s*=>\s*s\.id\)\)\)/;
      const newRegex =
        /handleSelectAll[\s\S]*?setLocalSelection\(new Set\(lernbareStrophen\.map\(/;

      const oldMatches = oldRegex.test(strophenDialog);
      const newMatches = newRegex.test(strophenDialog);

      return !oldMatches && newMatches;
    },
  },
  {
    testFile: "display-mode.property.test.ts",
    description:
      "Stage page no longer contains einzelzeile/EinzelzeileAnzeige/StrophenAnzeige/settings.displayMode — only StageSongAnzeige",
    sourceFile: "src/app/stage/[songId]/page.tsx",
    verify: () => {
      // Old patterns that should NOT be in the production source
      const hasEinzelzeileString = stagePage.includes('"einzelzeile"');
      const hasEinzelzeileAnzeige = stagePage.includes("EinzelzeileAnzeige");
      const hasStrophenAnzeige = stagePage.includes("StrophenAnzeige");
      const hasSettingsDisplayMode = stagePage.includes("settings.displayMode");

      // New pattern that SHOULD be in the production source
      const hasStageSongAnzeige = stagePage.includes("StageSongAnzeige");

      return (
        !hasEinzelzeileString &&
        !hasEinzelzeileAnzeige &&
        !hasStrophenAnzeige &&
        !hasSettingsDisplayMode &&
        hasStageSongAnzeige
      );
    },
  },
  {
    testFile: "song-info-overlay.test.ts",
    description:
      'Stage page no longer contains showSongInfo state variable (overlay was removed) — shouldShowSongInfo function still exists',
    sourceFile: "src/app/stage/[songId]/page.tsx",
    verify: () => {
      // The test checks for "showSongInfo" as a state in the source.
      // shouldShowSongInfo (the function) still exists, but showSongInfo as a
      // state variable (e.g. useState pattern like setShowSongInfo) does not.
      const hasShowSongInfoState =
        /\bsetShowSongInfo\b/.test(stagePage) ||
        /useState.*showSongInfo/.test(stagePage);

      // The function shouldShowSongInfo still exists
      const hasShouldShowSongInfo = stagePage.includes("shouldShowSongInfo");

      // Bug condition: state variable is gone, but function remains
      return !hasShowSongInfoState && hasShouldShowSongInfo;
    },
  },
  {
    testFile: "translate-button.test.ts",
    description:
      'Production code uses AppIcon with lucide:globe instead of 🌐 emoji',
    sourceFile: "src/components/songs/translate-button.tsx",
    verify: () => {
      // Old pattern: emoji string
      const hasEmoji = translateButton.includes("🌐 Übersetzen");

      // New patterns: AppIcon with lucide:globe and "Übersetzen" without emoji
      const hasAppIcon = translateButton.includes("AppIcon");
      const hasLucideGlobe = translateButton.includes('icon="lucide:globe"');
      const hasUebersetzen = translateButton.includes("Übersetzen");

      return !hasEmoji && hasAppIcon && hasLucideGlobe && hasUebersetzen;
    },
  },
  {
    testFile: "page-integration.test.ts",
    description:
      'Song detail page uses SongActionMenu instead of literal "Löschen", and dashboard has exactly 1 "+ Neuer Song"',
    sourceFile: "src/app/(main)/songs/[id]/page.tsx",
    verify: () => {
      // Old pattern: literal "Löschen" in song detail page (as a button label)
      // The word "Löschen" should NOT appear as a standalone button label in the page
      // (it's now inside SongActionMenu component)
      const hasLoeschenButton = songDetailPage.includes('"Löschen"') ||
        songDetailPage.includes(">Löschen<");

      // New pattern: SongActionMenu is imported and rendered
      const hasSongActionMenu = songDetailPage.includes("SongActionMenu");

      // Dashboard: "+ Neuer Song" should appear exactly 1 time
      const neuerSongMatches = dashboardPage.match(/\+ Neuer Song/g);
      const neuerSongCount = neuerSongMatches ? neuerSongMatches.length : 0;

      return !hasLoeschenButton && hasSongActionMenu && neuerSongCount === 1;
    },
  },
];

// ─── Property-based test ─────────────────────────────────────────────────────

describe("Bug Condition Exploration — Stale Source-String Assertions", () => {
  it("confirms bug condition exists for all affected test files", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...bugCases),
        (bugCase) => {
          const bugExists = bugCase.verify();
          expect(bugExists).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Individual checks for clearer error reporting
  it("completion.test.ts: old strophe iteration regex does not match production", () => {
    expect(bugCases[0].verify()).toBe(true);
  });

  it("dialog-strophe-order: old sorting regex does not match production", () => {
    expect(bugCases[1].verify()).toBe(true);
  });

  it("select-all-none: old handleSelectAll regex does not match production", () => {
    expect(bugCases[2].verify()).toBe(true);
  });

  it("display-mode: removed display modes not in production, StageSongAnzeige is sole component", () => {
    expect(bugCases[3].verify()).toBe(true);
  });

  it("song-info-overlay: showSongInfo state removed from production page", () => {
    expect(bugCases[4].verify()).toBe(true);
  });

  it("translate-button: emoji replaced with AppIcon in production", () => {
    expect(bugCases[5].verify()).toBe(true);
  });

  it("page-integration: SongActionMenu replaces Löschen, + Neuer Song appears exactly once", () => {
    expect(bugCases[6].verify()).toBe(true);
  });
});
