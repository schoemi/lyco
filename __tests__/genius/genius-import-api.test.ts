/**
 * Unit-Tests für Import-API-Route POST /api/songs/genius/import
 *
 * Testen: Auth-Fehler (401), fehlender API-Key (400),
 * erfolgreicher Import (201), leere Lyrics (422), Lyrics-Abruf-Fehler (502)
 *
 * Anforderungen: 3.2, 3.3, 3.4, 4.3, 5.2, 5.3
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Hoisted mocks ---
const { mockAuth, mockGetUserApiKey, mockFetchLyrics, mockImportSong } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockGetUserApiKey: vi.fn(),
    mockFetchLyrics: vi.fn(),
    mockImportSong: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/genius/api-key-store", () => ({
  getUserApiKey: mockGetUserApiKey,
}));
vi.mock("@/lib/genius/client", () => ({ fetchLyrics: mockFetchLyrics }));
vi.mock("@/lib/services/song-service", () => ({
  importSong: mockImportSong,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/songs/genius/import/route";

// --- Helper ---
function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL("/api/songs/genius/import", "http://localhost:3000"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

const validBody = {
  geniusId: 123,
  title: "Bohemian Rhapsody",
  artist: "Queen",
  geniusUrl: "https://genius.com/queen-bohemian-rhapsody-lyrics",
};

describe("POST /api/songs/genius/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Requirement 4.3: Auth-Fehler → 401 ---
  it("gibt 401 zurück wenn nicht authentifiziert", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Nicht authentifiziert");
  });

  // --- Requirement 4.4 / 5.2: Fehlender API-Key → 400 ---
  it("gibt 400 zurück wenn kein API-Schlüssel hinterlegt", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockRejectedValue(new Error("Kein Schlüssel"));

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Kein Genius-API-Schlüssel hinterlegt");
  });

  // --- Requirement 3.2, 3.3, 3.4: Erfolgreicher Import → 201 ---
  it("gibt 201 mit Song-Daten zurück bei erfolgreichem Import", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockResolvedValue("decrypted-api-key");

    const lyricsWithSections = [
      "[Verse 1]",
      "Is this the real life?",
      "Is this just fantasy?",
      "",
      "[Chorus]",
      "Mama, just killed a man",
    ].join("\n");
    mockFetchLyrics.mockResolvedValue(lyricsWithSections);

    const mockSong = {
      id: "song-1",
      titel: "Bohemian Rhapsody",
      kuenstler: "Queen",
      strophen: [
        { name: "Verse 1", zeilen: [{ text: "Is this the real life?" }, { text: "Is this just fantasy?" }] },
        { name: "Chorus", zeilen: [{ text: "Mama, just killed a man" }] },
      ],
    };
    mockImportSong.mockResolvedValue(mockSong);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.song).toEqual(mockSong);
    expect(mockFetchLyrics).toHaveBeenCalledWith(
      "https://genius.com/queen-bohemian-rhapsody-lyrics",
      "decrypted-api-key"
    );
    expect(mockImportSong).toHaveBeenCalledWith("user-1", expect.objectContaining({
      titel: "Bohemian Rhapsody",
      kuenstler: "Queen",
    }));
  });

  // --- Requirement 5.3: Leere Lyrics → 422 ---
  it("gibt 422 zurück wenn Lyrics keine gültigen Strophen ergeben", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockResolvedValue("decrypted-api-key");
    mockFetchLyrics.mockResolvedValue("   \n\n   ");

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("Keine gültigen Lyrics gefunden");
  });

  // --- Requirement 5.2: Lyrics-Abruf-Fehler → 502 ---
  it("gibt 502 zurück wenn Lyrics-Abruf fehlschlägt", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockResolvedValue("decrypted-api-key");
    mockFetchLyrics.mockRejectedValue(new Error("Scraping failed"));

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("Lyrics konnten nicht abgerufen werden");
  });
});
