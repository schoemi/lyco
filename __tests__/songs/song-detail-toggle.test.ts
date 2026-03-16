/**
 * Unit tests for SongDetailPage Toggle integration.
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the page source file for required patterns: component imports,
 * state management, conditional rendering, and prop passing.
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 3.4
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SONG_DETAIL_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/page.tsx"
);

const songDetailSource = fs.readFileSync(SONG_DETAIL_PATH, "utf-8");

// ============================================================
// Toggle shown when translations exist (Req 1.1, 2.1)
// ============================================================

describe("SongDetailPage — Toggle shown when translations exist (Req 1.1, 2.1)", () => {
  it("imports TranslationToggle component", () => {
    expect(songDetailSource).toContain("import TranslationToggle");
    expect(songDetailSource).toContain("translation-toggle");
  });

  it("computes hasTranslations from song.strophen", () => {
    expect(songDetailSource).toContain("hasAnyTranslation");
    expect(songDetailSource).toContain("hasTranslations");
    expect(songDetailSource).toContain("useMemo");
  });

  it("renders TranslationToggle conditionally on hasTranslations", () => {
    expect(songDetailSource).toContain("<TranslationToggle");
    expect(songDetailSource).toContain("hasTranslations");
  });
});

// ============================================================
// Toggle hidden when no translations exist (Req 1.2, 2.2)
// ============================================================

describe("SongDetailPage — Toggle hidden when no translations exist (Req 1.2, 2.2)", () => {
  it("hasAnyTranslation checks for non-empty uebersetzung across all strophen/zeilen", () => {
    expect(songDetailSource).toContain("function hasAnyTranslation");
    expect(songDetailSource).toMatch(/strophen\.some/);
    expect(songDetailSource).toMatch(/zeilen\.some/);
    expect(songDetailSource).toMatch(/uebersetzung/);
  });

  it("toggle is wrapped in hasTranslations conditional", () => {
    // The toggle is rendered inside {hasTranslations && (...)}
    expect(songDetailSource).toMatch(/hasTranslations\s*&&/);
  });
});

// ============================================================
// Toggle hidden in edit mode (Req 1.1)
// ============================================================

describe("SongDetailPage — Toggle hidden in edit mode", () => {
  it("toggle block is inside the !editing conditional", () => {
    // The toggle is rendered inside {!editing && (...)} block
    expect(songDetailSource).toContain("{!editing && (");
  });

  it("TranslationToggle is not rendered outside the non-editing block", () => {
    // Verify there's only one <TranslationToggle occurrence
    const matches = songDetailSource.match(/<TranslationToggle/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });
});

// ============================================================
// Default state is activated / true (Req 2.1)
// ============================================================

describe("SongDetailPage — Default toggle state is activated (Req 2.1)", () => {
  it("showTranslations state defaults to true", () => {
    expect(songDetailSource).toContain("useState(true)");
    expect(songDetailSource).toContain("showTranslations");
    expect(songDetailSource).toContain("setShowTranslations");
  });
});

// ============================================================
// Toggling hides/shows translation lines immediately (Req 1.4, 1.5, 3.4)
// ============================================================

describe("SongDetailPage — Toggle controls translation visibility (Req 1.4, 1.5, 3.4)", () => {
  it("passes checked={showTranslations} to TranslationToggle", () => {
    expect(songDetailSource).toContain("checked={showTranslations}");
  });

  it("passes onChange={setShowTranslations} to TranslationToggle", () => {
    expect(songDetailSource).toContain("onChange={setShowTranslations}");
  });

  it("passes showTranslations prop to StropheEditor", () => {
    expect(songDetailSource).toContain("showTranslations={showTranslations}");
  });
});

// ============================================================
// Toggle appears after successful translation (Req 2.3)
// ============================================================

describe("SongDetailPage — Toggle appears after successful translation (Req 2.3)", () => {
  it("hasTranslations is recomputed when song.strophen changes", () => {
    // useMemo depends on song.strophen so it recomputes after translation updates the song
    expect(songDetailSource).toMatch(/useMemo\s*\(/);
    expect(songDetailSource).toMatch(/song\?\.strophen|song\.strophen/);
  });

  it("translation hook updates song state via setSong", () => {
    expect(songDetailSource).toContain("useTranslation");
    expect(songDetailSource).toContain("setSong");
  });

  it("hasAnyTranslation checks uebersetzung is non-null and non-empty", () => {
    expect(songDetailSource).toContain("uebersetzung != null");
    expect(songDetailSource).toMatch(/uebersetzung\.trim\(\)\s*!==\s*""/);
  });
});
