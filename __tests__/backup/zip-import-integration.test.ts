import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks – available inside vi.mock factories
// ---------------------------------------------------------------------------
const { mockGetEntries, mockAdmZipConstructor, mockFindMany } = vi.hoisted(() => ({
  mockGetEntries: vi.fn(),
  mockAdmZipConstructor: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("adm-zip", () => ({
  default: mockAdmZipConstructor.mockImplementation(function () {
    return { getEntries: mockGetEntries };
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findMany: mockFindMany },
  },
}));

import { validateZipSecurity } from "@/lib/services/import-service";
// validateImport is the full flow function
import { validateImport } from "@/lib/services/import-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a Buffer with valid ZIP magic bytes (PK\x03\x04) */
function makeZipBuffer(): Buffer {
  const buf = Buffer.alloc(64);
  buf[0] = 0x50;
  buf[1] = 0x4b;
  buf[2] = 0x03;
  buf[3] = 0x04;
  return buf;
}

/** A minimal valid song manifest that passes validateSongManifestFull */
function validSongManifest() {
  return {
    exportVersion: "1.0",
    originalId: "song-001",
    titel: "Testlied",
    kuenstler: "Testkünstler",
    sprache: "de",
    coverUrl: null,
    analyse: null,
    coachTipp: null,
    emotionsTags: [],
    strophen: [
      {
        originalId: "strophe-001",
        name: "Strophe 1",
        orderIndex: 0,
        analyse: null,
        interpretation: null,
        notiz: null,
        markups: [],
        zeilen: [
          {
            originalId: "zeile-001",
            text: "Dies ist eine Testzeile",
            uebersetzung: null,
            orderIndex: 0,
            markups: [],
          },
        ],
      },
    ],
    audioQuellen: [],
  };
}

/** Creates a mock ZIP entry that behaves like an AdmZip.IZipEntry */
function mockEntry(entryName: string, data: string | Buffer, size?: number) {
  const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  return {
    entryName,
    header: { size: size ?? buf.length },
    getData: () => buf,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Import-Flow Integration: valid archive after security fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validateZipSecurity returns { valid: true } for a valid archive", () => {
    const zipBuffer = makeZipBuffer();

    mockGetEntries.mockReturnValue([
      mockEntry("song.json", JSON.stringify(validSongManifest()), 2048),
    ]);

    const securityResult = validateZipSecurity(zipBuffer);
    expect(securityResult).toEqual({ valid: true });
  });

  it("full validateImport flow succeeds with a valid single-song archive", async () => {
    const zipBuffer = makeZipBuffer();
    const manifest = validSongManifest();

    // Mock AdmZip entries: one song.json entry with valid manifest
    const songJsonEntry = mockEntry("song.json", JSON.stringify(manifest));
    mockGetEntries.mockReturnValue([songJsonEntry]);

    // No existing songs → no conflicts
    mockFindMany.mockResolvedValue([]);

    const result = await validateImport("user-123", zipBuffer);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.isSet).toBe(false);
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0]).toEqual({
      originalId: "song-001",
      titel: "Testlied",
      kuenstler: "Testkünstler",
      strophenCount: 1,
    });
    expect(result.conflicts).toEqual([]);
  });

  it("security check does not interfere with conflict detection", async () => {
    const zipBuffer = makeZipBuffer();
    const manifest = validSongManifest();

    mockGetEntries.mockReturnValue([
      mockEntry("song.json", JSON.stringify(manifest)),
    ]);

    // Simulate an existing song with the same originalId → conflict
    mockFindMany.mockResolvedValue([
      { id: "song-001", titel: "Existing Song" },
    ]);

    const result = await validateImport("user-456", zipBuffer);

    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toEqual({
      originalId: "song-001",
      titel: "Testlied",
      existingTitle: "Existing Song",
    });
  });

  it("security check rejects invalid archive before import logic runs", async () => {
    // Buffer without ZIP magic bytes
    const invalidBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

    const result = await validateImport("user-789", invalidBuffer);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Ungültiges Dateiformat: Keine gültige ZIP-Datei");
    expect(result.songs).toEqual([]);
    // AdmZip constructor should never be called for invalid magic bytes
    expect(mockAdmZipConstructor).not.toHaveBeenCalled();
  });
});
