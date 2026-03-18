import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCoachPrompt,
  validateCoachResponse,
  CoachError,
} from "@/lib/services/coach-service";
import type { ProfileData } from "@/types/profile";

// --- buildCoachPrompt tests ---

describe("buildCoachPrompt", () => {
  const baseProfile: ProfileData = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    alter: 30,
    geschlecht: "MAENNLICH",
    erfahrungslevel: "FORTGESCHRITTEN",
    stimmlage: "Tenor",
    genre: "Rock",
    sprache: "Deutsch",
    geniusApiKeyMasked: null,
  };

  const baseSong = {
    titel: "Bohemian Rhapsody",
    kuenstler: "Queen",
  };

  it("returns system and user messages", () => {
    const messages = buildCoachPrompt(baseProfile, baseSong);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("system prompt defines vocal coach role in German", () => {
    const [system] = buildCoachPrompt(baseProfile, baseSong);
    expect(system.content).toContain("Gesangscoach");
    expect(system.content).toContain("Deutsch");
  });

  it("user prompt contains geschlecht", () => {
    const [, user] = buildCoachPrompt(baseProfile, baseSong);
    expect(user.content).toContain("MAENNLICH");
  });

  it("user prompt contains genre", () => {
    const [, user] = buildCoachPrompt(baseProfile, baseSong);
    expect(user.content).toContain("Rock");
  });

  it("user prompt contains stimmlage", () => {
    const [, user] = buildCoachPrompt(baseProfile, baseSong);
    expect(user.content).toContain("Tenor");
  });

  it("user prompt contains erfahrungslevel", () => {
    const [, user] = buildCoachPrompt(baseProfile, baseSong);
    expect(user.content).toContain("FORTGESCHRITTEN");
  });

  it("user prompt contains song title and artist", () => {
    const [, user] = buildCoachPrompt(baseProfile, baseSong);
    expect(user.content).toContain("Bohemian Rhapsody");
    expect(user.content).toContain("Queen");
  });

  it("user prompt omits artist when kuenstler is null", () => {
    const [, user] = buildCoachPrompt(baseProfile, { titel: "Unknown", kuenstler: null });
    expect(user.content).toContain("Unknown");
    expect(user.content).not.toContain(" von null");
  });

  it("user prompt contains content instructions", () => {
    const [, user] = buildCoachPrompt(baseProfile, baseSong);
    expect(user.content).toContain("anspruchsvoll");
    expect(user.content).toContain("Kopfstimme");
    expect(user.content).toContain("Bruststimme");
    expect(user.content).toContain("Charakteristiken");
    expect(user.content).toContain("schwierige Passagen");
    expect(user.content).toContain("üben");
  });

  it("user prompt uses 'unbekannt' when genre is null", () => {
    const profile = { ...baseProfile, genre: null };
    const [, user] = buildCoachPrompt(profile, baseSong);
    expect(user.content).toContain("unbekannt");
  });
});

// --- validateCoachResponse tests ---

describe("validateCoachResponse", () => {
  it("returns trimmed text for valid response", () => {
    const result = validateCoachResponse("  Ein guter Tipp  ");
    expect(result).toBe("Ein guter Tipp");
  });

  it("throws on empty string", () => {
    expect(() => validateCoachResponse("")).toThrow("Die Coach-Antwort ist leer.");
  });

  it("throws on whitespace-only string", () => {
    expect(() => validateCoachResponse("   \n\t  ")).toThrow("Die Coach-Antwort ist leer.");
  });

  it("throws on null/undefined input", () => {
    expect(() => validateCoachResponse(null as unknown as string)).toThrow("Die Coach-Antwort ist leer.");
    expect(() => validateCoachResponse(undefined as unknown as string)).toThrow("Die Coach-Antwort ist leer.");
  });
});

// --- generateCoachTipp tests (with mocks) ---

import { prisma } from "@/lib/prisma";
import { generateCoachTipp } from "@/lib/services/coach-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/llm-client", () => ({
  createLLMClient: vi.fn(() => ({
    chat: vi.fn(),
  })),
}));

import { createLLMClient } from "@/lib/services/llm-client";

const mockSongFindUnique = vi.mocked(prisma.song.findUnique);
const mockSongUpdate = vi.mocked(prisma.song.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreateLLMClient = vi.mocked(createLLMClient);

describe("generateCoachTipp", () => {
  const userId = "user-1";
  const songId = "song-1";

  const mockSong = {
    id: songId,
    userId,
    titel: "Bohemian Rhapsody",
    kuenstler: "Queen",
  };

  const mockUser = {
    id: userId,
    name: "Test User",
    email: "test@example.com",
    alter: 30,
    geschlecht: "MAENNLICH",
    erfahrungslevel: "FORTGESCHRITTEN",
    stimmlage: "Tenor",
    genre: "Rock",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 404 when song does not exist", async () => {
    mockSongFindUnique.mockResolvedValue(null as any);

    await expect(generateCoachTipp(userId, songId)).rejects.toThrow(CoachError);
    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Song nicht gefunden",
    });
  });

  it("throws 403 when user does not own the song", async () => {
    mockSongFindUnique.mockResolvedValue({ ...mockSong, userId: "other-user" } as any);

    await expect(generateCoachTipp(userId, songId)).rejects.toThrow(CoachError);
    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 403,
      message: "Zugriff verweigert",
    });
  });

  it("throws 400 when geschlecht is missing", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue({ ...mockUser, geschlecht: null } as any);

    await expect(generateCoachTipp(userId, songId)).rejects.toThrow(CoachError);
    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 400 when erfahrungslevel is missing", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue({ ...mockUser, erfahrungslevel: null } as any);

    await expect(generateCoachTipp(userId, songId)).rejects.toThrow(CoachError);
    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 400 when stimmlage is missing", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue({ ...mockUser, stimmlage: null } as any);

    await expect(generateCoachTipp(userId, songId)).rejects.toThrow(CoachError);
    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("returns coachTipp on successful LLM call", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue(mockUser as any);
    mockSongUpdate.mockResolvedValue({} as any);

    const mockChat = vi.fn().mockResolvedValue("Ein personalisierter Coach-Tipp");
    mockCreateLLMClient.mockReturnValue({ chat: mockChat });

    const result = await generateCoachTipp(userId, songId);

    expect(result.coachTipp).toBe("Ein personalisierter Coach-Tipp");
    expect(mockSongUpdate).toHaveBeenCalledWith({
      where: { id: songId },
      data: { coachTipp: "Ein personalisierter Coach-Tipp" },
    });
  });

  it("creates LLM client with text response format", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue(mockUser as any);
    mockSongUpdate.mockResolvedValue({} as any);

    const mockChat = vi.fn().mockResolvedValue("Tipp");
    mockCreateLLMClient.mockReturnValue({ chat: mockChat });

    await generateCoachTipp(userId, songId);

    expect(mockCreateLLMClient).toHaveBeenCalledWith({ responseFormat: "text" });
  });

  it("throws CoachError with timeout message on timeout", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue(mockUser as any);

    const mockChat = vi.fn().mockRejectedValue(new Error("Connection timeout"));
    mockCreateLLMClient.mockReturnValue({ chat: mockChat });

    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 500,
      message: "Die Coach-Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
    });
  });

  it("throws CoachError with rate-limit message on 429", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue(mockUser as any);

    const mockChat = vi.fn().mockRejectedValue(new Error("LLM-Anfrage fehlgeschlagen (Status 429): Rate limit exceeded"));
    mockCreateLLMClient.mockReturnValue({ chat: mockChat });

    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 429,
      message: "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
    });
  });

  it("throws CoachError when LLM returns empty response", async () => {
    mockSongFindUnique.mockResolvedValue(mockSong as any);
    mockUserFindUnique.mockResolvedValue(mockUser as any);

    const mockChat = vi.fn().mockResolvedValue("   ");
    mockCreateLLMClient.mockReturnValue({ chat: mockChat });

    await expect(generateCoachTipp(userId, songId)).rejects.toMatchObject({
      statusCode: 500,
      message: "Die Coach-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.",
    });
  });
});
