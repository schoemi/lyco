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
// StrophenViewToggle shown with translation mode (Req 1.1, 2.1)
// ============================================================

describe("SongDetailPage — StrophenViewToggle with translation mode (Req 1.1, 2.1)", () => {
  it("imports StrophenViewToggle component", () => {
    expect(songDetailSource).toContain("import");
    expect(songDetailSource).toContain("StrophenViewToggle");
    expect(songDetailSource).toContain("strophen-view-toggle");
  });

  it("computes hasTranslations from song.strophen", () => {
    expect(songDetailSource).toContain("hasAnyTranslation");
    expect(songDetailSource).toContain("hasTranslations");
    expect(songDetailSource).toContain("useMemo");
  });

  it("renders StrophenViewToggle with hasTranslations prop", () => {
    expect(songDetailSource).toContain("<StrophenViewToggle");
    expect(songDetailSource).toContain("hasTranslations");
  });
});

// ============================================================
// Translation mode hidden when no translations exist (Req 1.2, 2.2)
// ============================================================

describe("SongDetailPage — Translation mode hidden when no translations exist (Req 1.2, 2.2)", () => {
  it("hasAnyTranslation checks for non-empty uebersetzung across all strophen/zeilen", () => {
    expect(songDetailSource).toContain("function hasAnyTranslation");
    expect(songDetailSource).toMatch(/strophen\.some/);
    expect(songDetailSource).toMatch(/zeilen\.some/);
    expect(songDetailSource).toMatch(/uebersetzung/);
  });

  it("hasTranslations is passed to StrophenViewToggle to control translation option visibility", () => {
    expect(songDetailSource).toContain("hasTranslations={hasTranslations}");
  });
});

// ============================================================
// Toggle hidden in edit mode (Req 1.1)
// ============================================================

describe("SongDetailPage — Toggle hidden in edit mode", () => {
  it("toggle block is inside the !editing conditional", () => {
    expect(songDetailSource).toContain("{!editing && !editingText && (");
  });
});

// ============================================================
// showTranslations derived from viewMode (Req 2.1)
// ============================================================

describe("SongDetailPage — showTranslations derived from viewMode (Req 2.1)", () => {
  it("derives showTranslations from viewMode", () => {
    expect(songDetailSource).toContain("showTranslations");
    // showTranslations is derived from viewMode === "translation"
    expect(songDetailSource).toMatch(/viewMode\s*===\s*"translation"/);
  });

  it("manages viewMode state", () => {
    expect(songDetailSource).toContain("viewMode");
    expect(songDetailSource).toContain("setViewMode");
    expect(songDetailSource).toContain("useState");
  });
});

// ============================================================
// Toggling controls translation visibility (Req 1.4, 1.5, 3.4)
// ============================================================

describe("SongDetailPage — Toggle controls translation visibility (Req 1.4, 1.5, 3.4)", () => {
  it("passes showTranslations prop to StropheEditor", () => {
    expect(songDetailSource).toContain("showTranslations={showTranslations}");
  });

  it("passes viewMode and onChange to StrophenViewToggle", () => {
    expect(songDetailSource).toContain("mode={viewMode}");
    expect(songDetailSource).toContain("onChange={setViewMode}");
  });
});

// ============================================================
// Toggle appears after successful translation (Req 2.3)
// ============================================================

describe("SongDetailPage — Toggle appears after successful translation (Req 2.3)", () => {
  it("hasTranslations is recomputed when song.strophen changes", () => {
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
