/**
 * Unit-Tests für `getSetPlaylist` in set-service.ts
 *
 * Testen:
 * - Filterlogik: nur Songs mit mindestens einer MP3-Quelle werden zurückgegeben
 * - skippedSongCount: Anzahl der Songs ohne MP3-Quelle
 * - Sortierung: orderIndex ASC, Tiebreaker titel ASC
 * - 404 bei nicht-existentem Set
 * - 403 bei fremdem Set
 *
 * Requirements: 1.2, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    set: {
      findUnique: vi.fn(),
    },
    setSong: {
      aggregate: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { getSetPlaylist } from "@/lib/services/set-service";

const mockPrisma = vi.mocked(prisma);

// --- Helpers ---

const now = new Date();

function makeSet(
  setId: string,
  userId: string,
  name: string,
  songs: ReturnType<typeof makeSong>[]
) {
  return {
    id: setId,
    name,
    description: null,
    userId,
    createdAt: now,
    updatedAt: now,
    songs,
  };
}

function makeSong(
  songId: string,
  titel: string,
  orderIndex: number,
  audioQuellen: ReturnType<typeof makeMp3Quelle>[]
) {
  return {
    id: `ss-${songId}`,
    setId: "set-1",
    songId,
    orderIndex,
    createdAt: now,
    song: {
      id: songId,
      titel,
      kuenstler: null,
      audioQuellen,
    },
  };
}

function makeMp3Quelle(id: string, rolle: string = "STANDARD") {
  return {
    id,
    url: `https://example.com/${id}.mp3`,
    typ: "MP3",
    label: "Original",
    orderIndex: 0,
    rolle,
  };
}

// --- Tests ---

describe("getSetPlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Requirement 1.1 / 1.2: Filter ───

  describe("Filterlogik: nur Songs mit MP3-Quelle (Req. 1.2, 1.4)", () => {
    it("returns only songs that have at least one MP3 source", async () => {
      const songs = [
        makeSong("song-1", "Song Mit MP3", 0, [makeMp3Quelle("aq-1")]),
        makeSong("song-2", "Song Ohne MP3", 1, []), // no audio sources → should be filtered
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Mein Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs).toHaveLength(1);
      expect(result.songs[0].id).toBe("song-1");
      expect(result.songs[0].titel).toBe("Song Mit MP3");
    });

    it("returns empty songs array when no song has an MP3 source", async () => {
      const songs = [
        makeSong("song-1", "Song A", 0, []),
        makeSong("song-2", "Song B", 1, []),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Leeres Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs).toHaveLength(0);
      expect(result.skippedSongCount).toBe(2);
    });

    it("returns all songs when all have MP3 sources", async () => {
      const songs = [
        makeSong("song-1", "Song A", 0, [makeMp3Quelle("aq-1")]),
        makeSong("song-2", "Song B", 1, [makeMp3Quelle("aq-2")]),
        makeSong("song-3", "Song C", 2, [makeMp3Quelle("aq-3")]),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Volles Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs).toHaveLength(3);
      expect(result.skippedSongCount).toBe(0);
    });

    it("audioQuellen in response only contains MP3 sources", async () => {
      const songs = [
        makeSong("song-1", "Song A", 0, [
          makeMp3Quelle("aq-mp3-1"),
          makeMp3Quelle("aq-mp3-2", "INSTRUMENTAL"),
        ]),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs[0].audioQuellen).toHaveLength(2);
      expect(result.songs[0].audioQuellen.every((q) => q.typ === "MP3")).toBe(true);
    });
  });

  // ─── skippedSongCount ───

  describe("skippedSongCount (Req. 1.4)", () => {
    it("calculates skippedSongCount correctly when some songs have no MP3", async () => {
      const songs = [
        makeSong("song-1", "Hat MP3", 0, [makeMp3Quelle("aq-1")]),
        makeSong("song-2", "Kein MP3 A", 1, []),
        makeSong("song-3", "Hat MP3 auch", 2, [makeMp3Quelle("aq-3")]),
        makeSong("song-4", "Kein MP3 B", 3, []),
        makeSong("song-5", "Kein MP3 C", 4, []),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Gemischtes Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs).toHaveLength(2);
      expect(result.skippedSongCount).toBe(3);
    });

    it("skippedSongCount is 0 when all songs have MP3 sources", async () => {
      const songs = [
        makeSong("song-1", "A", 0, [makeMp3Quelle("aq-1")]),
        makeSong("song-2", "B", 1, [makeMp3Quelle("aq-2")]),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.skippedSongCount).toBe(0);
    });

    it("skippedSongCount equals total songs when none have MP3 sources", async () => {
      const songs = [
        makeSong("song-1", "A", 0, []),
        makeSong("song-2", "B", 1, []),
        makeSong("song-3", "C", 2, []),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.skippedSongCount).toBe(3);
    });
  });

  // ─── Sortierung (Req. 1.5) ───

  describe("Sortierung: orderIndex ASC, Tiebreaker titel ASC (Req. 1.5)", () => {
    it("sorts songs by orderIndex ascending", async () => {
      // Intentionally pass songs out of order to verify sorting
      const songs = [
        makeSong("song-3", "C", 2, [makeMp3Quelle("aq-3")]),
        makeSong("song-1", "A", 0, [makeMp3Quelle("aq-1")]),
        makeSong("song-2", "B", 1, [makeMp3Quelle("aq-2")]),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs[0].orderIndex).toBe(0);
      expect(result.songs[1].orderIndex).toBe(1);
      expect(result.songs[2].orderIndex).toBe(2);
    });

    it("sorts songs with equal orderIndex alphabetically by titel (tiebreaker)", async () => {
      // Three songs with the same orderIndex — should sort by title A→Z
      const songs = [
        makeSong("song-c", "Zebra", 0, [makeMp3Quelle("aq-c")]),
        makeSong("song-a", "Alpha", 0, [makeMp3Quelle("aq-a")]),
        makeSong("song-b", "Mitte", 0, [makeMp3Quelle("aq-b")]),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs[0].titel).toBe("Alpha");
      expect(result.songs[1].titel).toBe("Mitte");
      expect(result.songs[2].titel).toBe("Zebra");
    });

    it("primary sort is orderIndex, tiebreaker is titel", async () => {
      // Mix: some songs with same orderIndex, some different
      const songs = [
        makeSong("song-d", "Zulu", 1, [makeMp3Quelle("aq-d")]),
        makeSong("song-b", "Bravo", 0, [makeMp3Quelle("aq-b")]),
        makeSong("song-c", "Alpha", 1, [makeMp3Quelle("aq-c")]),
        makeSong("song-a", "Alfa", 0, [makeMp3Quelle("aq-a")]),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      // orderIndex 0: "Alfa" < "Bravo"
      expect(result.songs[0].titel).toBe("Alfa");
      expect(result.songs[0].orderIndex).toBe(0);
      expect(result.songs[1].titel).toBe("Bravo");
      expect(result.songs[1].orderIndex).toBe(0);
      // orderIndex 1: "Alpha" < "Zulu"
      expect(result.songs[2].titel).toBe("Alpha");
      expect(result.songs[2].orderIndex).toBe(1);
      expect(result.songs[3].titel).toBe("Zulu");
      expect(result.songs[3].orderIndex).toBe(1);
    });

    it("sorting is applied only to songs with MP3 sources (filtered set)", async () => {
      // song-skip has no MP3 and orderIndex 0 — it should be skipped,
      // and the remaining songs should still be sorted correctly
      const songs = [
        makeSong("song-skip", "AAA (no mp3)", 0, []),
        makeSong("song-b", "Beta", 2, [makeMp3Quelle("aq-b")]),
        makeSong("song-a", "Alpha", 1, [makeMp3Quelle("aq-a")]),
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs).toHaveLength(2);
      expect(result.songs[0].titel).toBe("Alpha");
      expect(result.songs[0].orderIndex).toBe(1);
      expect(result.songs[1].titel).toBe("Beta");
      expect(result.songs[1].orderIndex).toBe(2);
    });
  });

  // ─── Response shape ───

  describe("Response shape", () => {
    it("returns setId and setName from the set", async () => {
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-42", "user-1", "Konzert März 2025", [
          makeSong("song-1", "Song", 0, [makeMp3Quelle("aq-1")]),
        ]) as any
      );

      const result = await getSetPlaylist("user-1", "set-42");

      expect(result.setId).toBe("set-42");
      expect(result.setName).toBe("Konzert März 2025");
    });

    it("maps song fields correctly to PlaylistSong", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const songs: any[] = [
        {
          ...makeSong("song-1", "Bohemian Rhapsody", 0, [makeMp3Quelle("aq-1")]),
          song: {
            id: "song-1",
            titel: "Bohemian Rhapsody",
            kuenstler: "Queen",
            audioQuellen: [makeMp3Quelle("aq-1")],
          },
        },
      ];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      const song = result.songs[0];
      expect(song.id).toBe("song-1");
      expect(song.titel).toBe("Bohemian Rhapsody");
      expect(song.kuenstler).toBe("Queen");
      expect(song.orderIndex).toBe(0);
      expect(song.audioQuellen).toHaveLength(1);
      expect(song.audioQuellen[0].id).toBe("aq-1");
    });

    it("sets kuenstler to null when song has no artist info", async () => {
      const songs = [makeSong("song-1", "Instrumental", 0, [makeMp3Quelle("aq-1")])];
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Set", songs) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs[0].kuenstler).toBeNull();
    });
  });

  // ─── Fehlerbehandlung ───

  describe("Fehlerbehandlung", () => {
    it("throws 'Set nicht gefunden' for non-existent set (404)", async () => {
      mockPrisma.set.findUnique.mockResolvedValueOnce(null);

      await expect(getSetPlaylist("user-1", "set-nonexistent")).rejects.toThrow(
        "Set nicht gefunden"
      );
    });

    it("throws 'Zugriff verweigert' when set belongs to a different user (403)", async () => {
      const foreignSet = makeSet("set-1", "other-user", "Fremdes Set", []);
      mockPrisma.set.findUnique.mockResolvedValueOnce(foreignSet as any);

      await expect(getSetPlaylist("user-1", "set-1")).rejects.toThrow(
        "Zugriff verweigert"
      );
    });

    it("does not throw for an empty set (0 songs)", async () => {
      mockPrisma.set.findUnique.mockResolvedValueOnce(
        makeSet("set-1", "user-1", "Leeres Set", []) as any
      );

      const result = await getSetPlaylist("user-1", "set-1");

      expect(result.songs).toHaveLength(0);
      expect(result.skippedSongCount).toBe(0);
    });
  });
});
