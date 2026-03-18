/**
 * Bug-Condition-Explorationstest — Property 1: coverUrl wird von updateSong ignoriert
 *
 * Validates: Requirements 1.4, 2.2, 2.4
 *
 * Dieser Test prüft: Wenn updateSong mit einem coverUrl-Feld aufgerufen wird,
 * soll prisma.song.update mit coverUrl in data aufgerufen werden und das
 * zurückgegebene Song-Objekt die aktualisierte coverUrl enthalten.
 *
 * Auf UNGEFIXTEM Code wird dieser Test FEHLSCHLAGEN, da:
 * 1. UpdateSongInput kein coverUrl-Feld enthält
 * 2. updateSong coverUrl nicht in updateData aufnimmt
 *
 * EXPECTED OUTCOME: Test FAILS — bestätigt, dass der Bug existiert.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  return {
    mockPrisma: { song: _mockSong },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { updateSong } from "@/lib/services/song-service";
import { prisma } from "@/lib/prisma";

// --- Constants ---
const USER_ID = "user-1";
const SONG_ID = "song-1";

const existingSong = {
  id: SONG_ID,
  titel: "Existing Song",
  kuenstler: "Artist",
  sprache: "de",
  emotionsTags: ["happy"],
  coverUrl: null,
  userId: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// --- Arbitraries ---
const arbCoverUrl = fc.webUrl().filter((u) => u.length > 0);

// --- Tests ---
describe("Bug Condition Exploration: coverUrl wird von updateSong ignoriert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Property 1: updateSong mit coverUrl-String übergibt coverUrl an prisma.song.update", async () => {
    await fc.assert(
      fc.asyncProperty(arbCoverUrl, async (coverUrl) => {
        vi.clearAllMocks();

        vi.mocked(prisma.song.findUnique).mockResolvedValue(existingSong as any);
        vi.mocked(prisma.song.update).mockImplementation(async (args: any) => ({
          ...existingSong,
          ...args.data,
          updatedAt: new Date(),
        }));

        // Call updateSong with coverUrl — on unfixed code this field is ignored
        const result = await updateSong(USER_ID, SONG_ID, { coverUrl } as any);

        // Assert prisma.song.update was called with coverUrl in data
        expect(prisma.song.update).toHaveBeenCalledTimes(1);
        const updateCall = vi.mocked(prisma.song.update).mock.calls[0][0] as any;
        expect(updateCall.data).toHaveProperty("coverUrl", coverUrl);

        // Assert the returned song reflects the updated coverUrl
        expect(result.coverUrl).toBe(coverUrl);
      }),
      { numRuns: 20 },
    );
  });

  it("Property 1b: updateSong mit coverUrl: null übergibt null an prisma.song.update (Cover entfernen)", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue({
      ...existingSong,
      coverUrl: "https://example.com/old-cover.jpg",
    } as any);
    vi.mocked(prisma.song.update).mockImplementation(async (args: any) => ({
      ...existingSong,
      ...args.data,
      updatedAt: new Date(),
    }));

    const result = await updateSong(USER_ID, SONG_ID, { coverUrl: null } as any);

    expect(prisma.song.update).toHaveBeenCalledTimes(1);
    const updateCall = vi.mocked(prisma.song.update).mock.calls[0][0] as any;
    expect(updateCall.data).toHaveProperty("coverUrl", null);

    expect(result.coverUrl).toBeNull();
  });
});
