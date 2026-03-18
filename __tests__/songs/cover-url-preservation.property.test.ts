/**
 * Preservation Property Test — Property 2: Bestehende Song-Felder unverändert
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * Dieser Test prüft: Wenn updateSong OHNE coverUrl aufgerufen wird,
 * werden nur die übergebenen Felder (titel, kuenstler, sprache, emotionsTags)
 * an prisma.song.update weitergegeben. coverUrl taucht nie in updateData auf.
 *
 * Auf UNGEFIXTEM Code müssen diese Tests BESTEHEN, da sie das bestehende
 * korrekte Verhalten für Nicht-Bug-Eingaben verifizieren.
 *
 * EXPECTED OUTCOME: Tests PASS — bestätigt Baseline-Verhalten.
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
  coverUrl: "https://example.com/existing-cover.jpg",
  userId: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// --- Arbitraries ---
const arbTitel = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
const arbKuenstler = fc.string({ minLength: 0, maxLength: 100 });
const arbSprache = fc.constantFrom("de", "en", "fr", "es", "nl", "it");
const arbEmotionsTags = fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 });

// Generate an arbitrary subset of update fields (all optional, at least one present)
const arbUpdateFields = fc.record(
  {
    titel: arbTitel,
    kuenstler: arbKuenstler,
    sprache: arbSprache,
    emotionsTags: arbEmotionsTags,
  },
  { requiredKeys: [] },
);

// --- Tests ---
describe("Preservation: Bestehende Song-Felder unverändert (Property 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Property 2a: Nur übergebene Felder erscheinen in prisma.song.update data", async () => {
    await fc.assert(
      fc.asyncProperty(arbUpdateFields, async (fields) => {
        // Skip empty updates — tested separately
        const providedKeys = Object.keys(fields).filter(
          (k) => (fields as Record<string, unknown>)[k] !== undefined,
        );
        if (providedKeys.length === 0) return;

        // Skip if titel is provided but empty after trim (that's the validation error case)
        if (fields.titel !== undefined && fields.titel.trim() === "") return;

        vi.clearAllMocks();

        vi.mocked(prisma.song.findUnique).mockResolvedValue(existingSong as any);
        vi.mocked(prisma.song.update).mockImplementation(async (args: any) => ({
          ...existingSong,
          ...args.data,
          updatedAt: new Date(),
        }));

        await updateSong(USER_ID, SONG_ID, fields);

        expect(prisma.song.update).toHaveBeenCalledTimes(1);
        const updateCall = vi.mocked(prisma.song.update).mock.calls[0][0] as any;
        const updateData = updateCall.data;

        // Only provided fields should appear in updateData
        for (const key of providedKeys) {
          expect(updateData).toHaveProperty(key);
        }

        // coverUrl must NEVER appear in updateData when not provided
        expect(updateData).not.toHaveProperty("coverUrl");
      }),
      { numRuns: 50 },
    );
  });

  it("Property 2b: titel-Wert wird korrekt getrimmt und weitergegeben", async () => {
    await fc.assert(
      fc.asyncProperty(arbTitel, async (titel) => {
        vi.clearAllMocks();

        vi.mocked(prisma.song.findUnique).mockResolvedValue(existingSong as any);
        vi.mocked(prisma.song.update).mockImplementation(async (args: any) => ({
          ...existingSong,
          ...args.data,
          updatedAt: new Date(),
        }));

        await updateSong(USER_ID, SONG_ID, { titel });

        expect(prisma.song.update).toHaveBeenCalledTimes(1);
        const updateCall = vi.mocked(prisma.song.update).mock.calls[0][0] as any;
        expect(updateCall.data.titel).toBe(titel.trim());
      }),
      { numRuns: 30 },
    );
  });

  it("Property 2c: kuenstler, sprache, emotionsTags werden unverändert weitergegeben", async () => {
    await fc.assert(
      fc.asyncProperty(arbKuenstler, arbSprache, arbEmotionsTags, async (kuenstler, sprache, emotionsTags) => {
        vi.clearAllMocks();

        vi.mocked(prisma.song.findUnique).mockResolvedValue(existingSong as any);
        vi.mocked(prisma.song.update).mockImplementation(async (args: any) => ({
          ...existingSong,
          ...args.data,
          updatedAt: new Date(),
        }));

        await updateSong(USER_ID, SONG_ID, { kuenstler, sprache, emotionsTags });

        expect(prisma.song.update).toHaveBeenCalledTimes(1);
        const updateCall = vi.mocked(prisma.song.update).mock.calls[0][0] as any;
        expect(updateCall.data.kuenstler).toBe(kuenstler);
        expect(updateCall.data.sprache).toBe(sprache);
        expect(updateCall.data.emotionsTags).toEqual(emotionsTags);
        expect(updateCall.data).not.toHaveProperty("coverUrl");
      }),
      { numRuns: 30 },
    );
  });

  it("Property 2d: Leerer Titel wirft Validierungsfehler", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue(existingSong as any);

    await expect(updateSong(USER_ID, SONG_ID, { titel: "" })).rejects.toThrow("Titel ist erforderlich");
    await expect(updateSong(USER_ID, SONG_ID, { titel: "   " })).rejects.toThrow("Titel ist erforderlich");

    // prisma.song.update should NOT have been called
    expect(prisma.song.update).not.toHaveBeenCalled();
  });

  it("Property 2e: Leeres Update-Objekt ruft prisma.song.update mit leerem data auf", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue(existingSong as any);
    vi.mocked(prisma.song.update).mockImplementation(async (args: any) => ({
      ...existingSong,
      ...args.data,
      updatedAt: new Date(),
    }));

    await updateSong(USER_ID, SONG_ID, {});

    expect(prisma.song.update).toHaveBeenCalledTimes(1);
    const updateCall = vi.mocked(prisma.song.update).mock.calls[0][0] as any;
    expect(updateCall.data).toEqual({});
    expect(updateCall.data).not.toHaveProperty("coverUrl");
  });
});
