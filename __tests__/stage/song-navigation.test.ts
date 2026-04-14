// Feature: lyco-stage — Song-Navigation (Req 5.2, 5.5)
import { describe, it, expect } from "vitest";
import { sortSongsByOrderIndex } from "@/app/stage/page";

/**
 * Unit-Test für Song-Navigation
 *
 * Testet Song-Wechsel und Rückkehr zur Setlist beim letzten Song.
 * Verwendet Source-Code-Inspection-Pattern (pure logic functions).
 *
 * Anforderungen: 5.2, 5.5
 */

// ─── Helper: simulate navigation logic ───────────────────────────────────────

/**
 * Given a set's sorted songs and the current songId,
 * returns the next songId or null if it's the last song.
 * Mirrors the logic in StagePrompterPage.
 */
function getNextSongId(
  setSongs: { songId: string; orderIndex: number }[],
  currentSongId: string,
): string | null {
  const sorted = sortSongsByOrderIndex(setSongs);
  const idx = sorted.findIndex((s) => s.songId === currentSongId);
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1].songId;
}

/**
 * Returns true when the current song is the last in the set.
 * When true, the stage should navigate back to the setlist view (Req 5.5).
 */
function isLastSongInSet(
  setSongs: { songId: string; orderIndex: number }[],
  currentSongId: string,
): boolean {
  return getNextSongId(setSongs, currentSongId) === null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Song-Navigation (Req 5.2, 5.5)", () => {
  const songs = [
    { songId: "song-a", orderIndex: 0 },
    { songId: "song-b", orderIndex: 1 },
    { songId: "song-c", orderIndex: 2 },
  ];

  describe("getNextSongId — Song-Wechsel (Req 5.2)", () => {
    it("gibt den nächsten Song zurück wenn nicht der letzte", () => {
      expect(getNextSongId(songs, "song-a")).toBe("song-b");
      expect(getNextSongId(songs, "song-b")).toBe("song-c");
    });

    it("gibt null zurück beim letzten Song", () => {
      expect(getNextSongId(songs, "song-c")).toBeNull();
    });

    it("gibt null zurück wenn songId nicht gefunden", () => {
      expect(getNextSongId(songs, "unknown")).toBeNull();
    });

    it("funktioniert mit unsortierten orderIndex-Werten", () => {
      const unsorted = [
        { songId: "song-z", orderIndex: 10 },
        { songId: "song-a", orderIndex: 1 },
        { songId: "song-m", orderIndex: 5 },
      ];
      // After sorting: song-a(1) → song-m(5) → song-z(10)
      expect(getNextSongId(unsorted, "song-a")).toBe("song-m");
      expect(getNextSongId(unsorted, "song-m")).toBe("song-z");
      expect(getNextSongId(unsorted, "song-z")).toBeNull();
    });

    it("gibt null zurück bei leerer Setlist", () => {
      expect(getNextSongId([], "song-a")).toBeNull();
    });

    it("gibt null zurück bei Setlist mit einem Song", () => {
      expect(getNextSongId([{ songId: "only", orderIndex: 0 }], "only")).toBeNull();
    });
  });

  describe("isLastSongInSet — Rückkehr zur Setlist (Req 5.5)", () => {
    it("gibt false zurück für Songs die nicht der letzte sind", () => {
      expect(isLastSongInSet(songs, "song-a")).toBe(false);
      expect(isLastSongInSet(songs, "song-b")).toBe(false);
    });

    it("gibt true zurück für den letzten Song", () => {
      expect(isLastSongInSet(songs, "song-c")).toBe(true);
    });

    it("gibt true zurück wenn songId nicht in der Setlist", () => {
      expect(isLastSongInSet(songs, "not-in-list")).toBe(true);
    });

    it("gibt true zurück bei Setlist mit einem Song", () => {
      expect(
        isLastSongInSet([{ songId: "only", orderIndex: 0 }], "only"),
      ).toBe(true);
    });

    it("gibt true zurück bei leerer Setlist", () => {
      expect(isLastSongInSet([], "song-a")).toBe(true);
    });
  });

  describe("Reihenfolge-Erhaltung bei Navigation", () => {
    it("Navigation folgt der orderIndex-Reihenfolge, nicht der Array-Reihenfolge", () => {
      // Songs in reverse order in array, but orderIndex defines sequence
      const reversed = [
        { songId: "third", orderIndex: 2 },
        { songId: "first", orderIndex: 0 },
        { songId: "second", orderIndex: 1 },
      ];
      expect(getNextSongId(reversed, "first")).toBe("second");
      expect(getNextSongId(reversed, "second")).toBe("third");
      expect(getNextSongId(reversed, "third")).toBeNull();
    });
  });
});
