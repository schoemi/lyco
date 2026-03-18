import { describe, it, expect } from "vitest";
import {
  buildAnalysePrompt,
  validateAnalyseResponse,
} from "@/lib/services/analyse-service";

describe("buildAnalysePrompt", () => {
  it("returns system and user messages", () => {
    const song = {
      titel: "Testlied",
      kuenstler: "Testkünstler",
      strophen: [
        { name: "Vers 1", zeilen: [{ text: "Zeile eins" }, { text: "Zeile zwei" }] },
      ],
    };

    const messages = buildAnalysePrompt(song);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("system prompt contains analyst role and emotional focus", () => {
    const song = {
      titel: "Test",
      strophen: [{ name: "V1", zeilen: [{ text: "text" }] }],
    };

    const [system] = buildAnalysePrompt(song);

    expect(system.content).toContain("Songtext-Analyst");
    expect(system.content).toContain("emotionale Bedeutung");
    expect(system.content).toContain("Antworte auf Deutsch");
  });

  it("user prompt contains title and artist", () => {
    const song = {
      titel: "Boulevard of Broken Dreams",
      kuenstler: "Green Day",
      strophen: [{ name: "V1", zeilen: [{ text: "I walk a lonely road" }] }],
    };

    const [, user] = buildAnalysePrompt(song);

    expect(user.content).toContain("Titel: Boulevard of Broken Dreams");
    expect(user.content).toContain("Künstler: Green Day");
  });

  it("user prompt omits artist line when kuenstler is null", () => {
    const song = {
      titel: "Unknown",
      kuenstler: null,
      strophen: [{ name: "V1", zeilen: [{ text: "text" }] }],
    };

    const [, user] = buildAnalysePrompt(song);

    expect(user.content).not.toContain("Künstler:");
  });

  it("user prompt omits artist line when kuenstler is undefined", () => {
    const song = {
      titel: "Unknown",
      strophen: [{ name: "V1", zeilen: [{ text: "text" }] }],
    };

    const [, user] = buildAnalysePrompt(song);

    expect(user.content).not.toContain("Künstler:");
  });

  it("user prompt contains all zeilen from all strophen", () => {
    const song = {
      titel: "Test",
      strophen: [
        { name: "Vers 1", zeilen: [{ text: "Erste Zeile" }, { text: "Zweite Zeile" }] },
        { name: "Refrain", zeilen: [{ text: "Refrain Zeile" }] },
      ],
    };

    const [, user] = buildAnalysePrompt(song);

    expect(user.content).toContain("Erste Zeile");
    expect(user.content).toContain("Zweite Zeile");
    expect(user.content).toContain("Refrain Zeile");
  });

  it("user prompt contains strophe markers with index and name", () => {
    const song = {
      titel: "Test",
      strophen: [
        { name: "Vers 1", zeilen: [{ text: "text" }] },
        { name: "Refrain", zeilen: [{ text: "text" }] },
      ],
    };

    const [, user] = buildAnalysePrompt(song);

    expect(user.content).toContain("[Strophe 1: Vers 1]");
    expect(user.content).toContain("[Strophe 2: Refrain]");
  });

  it("skips empty strophen (without zeilen)", () => {
    const song = {
      titel: "Test",
      strophen: [
        { name: "Vers 1", zeilen: [{ text: "text" }] },
        { name: "Leer", zeilen: [] },
        { name: "Vers 2", zeilen: [{ text: "more text" }] },
      ],
    };

    const [, user] = buildAnalysePrompt(song);

    expect(user.content).not.toContain("Leer");
    expect(user.content).toContain("[Strophe 1: Vers 1]");
    expect(user.content).toContain("[Strophe 2: Vers 2]");
  });

  it("user prompt contains JSON structure instructions", () => {
    const song = {
      titel: "Test",
      strophen: [{ name: "V1", zeilen: [{ text: "text" }] }],
    };

    const [, user] = buildAnalysePrompt(song);

    expect(user.content).toContain("songAnalyse");
    expect(user.content).toContain("emotionsTags");
    expect(user.content).toContain("strophenAnalysen");
    expect(user.content).toContain("stropheIndex");
    expect(user.content).toContain("JSON-Objekt");
  });
});


describe("validateAnalyseResponse", () => {
  const validResponse = (strophenCount: number) =>
    JSON.stringify({
      songAnalyse: "Eine tiefgründige Analyse",
      emotionsTags: ["Melancholie", "Sehnsucht"],
      strophenAnalysen: Array.from({ length: strophenCount }, (_, i) => ({
        stropheIndex: i,
        analyse: `Analyse für Strophe ${i}`,
      })),
    });

  it("parses a valid response", () => {
    const result = validateAnalyseResponse(validResponse(2), 2);

    expect(result.songAnalyse).toBe("Eine tiefgründige Analyse");
    expect(result.emotionsTags).toEqual(["Melancholie", "Sehnsucht"]);
    expect(result.strophenAnalysen).toHaveLength(2);
    expect(result.strophenAnalysen[0].stropheIndex).toBe(0);
    expect(result.strophenAnalysen[0].analyse).toBe("Analyse für Strophe 0");
  });

  it("throws on invalid JSON", () => {
    expect(() => validateAnalyseResponse("not json", 1)).toThrow(
      "Die Analyse konnte nicht verarbeitet werden"
    );
  });

  it("throws on JSON array instead of object", () => {
    expect(() => validateAnalyseResponse("[]", 1)).toThrow(
      "Die Analyse konnte nicht verarbeitet werden"
    );
  });

  it("throws on null JSON", () => {
    expect(() => validateAnalyseResponse("null", 1)).toThrow(
      "Die Analyse konnte nicht verarbeitet werden"
    );
  });

  it("throws when songAnalyse is missing", () => {
    const raw = JSON.stringify({
      emotionsTags: ["tag"],
      strophenAnalysen: [{ stropheIndex: 0, analyse: "text" }],
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "songAnalyse muss ein nicht-leerer String sein"
    );
  });

  it("throws when songAnalyse is empty string", () => {
    const raw = JSON.stringify({
      songAnalyse: "   ",
      emotionsTags: ["tag"],
      strophenAnalysen: [{ stropheIndex: 0, analyse: "text" }],
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "songAnalyse muss ein nicht-leerer String sein"
    );
  });

  it("throws when emotionsTags is not an array", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: "not-array",
      strophenAnalysen: [{ stropheIndex: 0, analyse: "text" }],
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "emotionsTags muss ein Array sein"
    );
  });

  it("throws when emotionsTags contains non-strings", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: ["valid", 42],
      strophenAnalysen: [{ stropheIndex: 0, analyse: "text" }],
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "emotionsTags muss ein Array von Strings sein"
    );
  });

  it("throws when strophenAnalysen is not an array", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: ["tag"],
      strophenAnalysen: "not-array",
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "strophenAnalysen muss ein Array sein"
    );
  });

  it("throws when strophenAnalysen item is not an object", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: ["tag"],
      strophenAnalysen: ["not-object"],
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "strophenAnalysen muss Objekte mit stropheIndex und analyse enthalten"
    );
  });

  it("throws when stropheIndex is not a number", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: ["tag"],
      strophenAnalysen: [{ stropheIndex: "zero", analyse: "text" }],
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "stropheIndex muss eine Zahl sein"
    );
  });

  it("throws when analyse in strophenAnalysen is not a string", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: ["tag"],
      strophenAnalysen: [{ stropheIndex: 0, analyse: 123 }],
    });
    expect(() => validateAnalyseResponse(raw, 1)).toThrow(
      "analyse muss ein String sein"
    );
  });

  it("throws when strophenAnalysen count does not match", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: ["tag"],
      strophenAnalysen: [
        { stropheIndex: 0, analyse: "text" },
        { stropheIndex: 1, analyse: "text" },
      ],
    });
    expect(() => validateAnalyseResponse(raw, 3)).toThrow(
      "Erwartete 3 Strophen-Analysen, aber 2 erhalten"
    );
  });

  it("accepts empty emotionsTags array", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: [],
      strophenAnalysen: [{ stropheIndex: 0, analyse: "text" }],
    });
    const result = validateAnalyseResponse(raw, 1);
    expect(result.emotionsTags).toEqual([]);
  });

  it("accepts zero strophenCount with empty array", () => {
    const raw = JSON.stringify({
      songAnalyse: "Analyse",
      emotionsTags: ["tag"],
      strophenAnalysen: [],
    });
    const result = validateAnalyseResponse(raw, 0);
    expect(result.strophenAnalysen).toEqual([]);
  });
});


// --- getAnalysis tests ---

import { vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAnalysis, AnalyseError } from "@/lib/services/analyse-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
    },
  },
}));

const mockSongFindUnique = vi.mocked(prisma.song.findUnique);

describe("getAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 404 when song does not exist", async () => {
    mockSongFindUnique.mockResolvedValue(null as any);

    await expect(getAnalysis("user-1", "nonexistent")).rejects.toThrow(
      AnalyseError
    );
    await expect(getAnalysis("user-1", "nonexistent")).rejects.toMatchObject({
      statusCode: 404,
      message: "Song nicht gefunden",
    });
  });

  it("throws 403 when user does not own the song", async () => {
    mockSongFindUnique.mockResolvedValue({
      id: "song-1",
      userId: "other-user",
      analyse: "some analysis",
      emotionsTags: [],
      strophen: [],
    } as any);

    await expect(getAnalysis("user-1", "song-1")).rejects.toThrow(AnalyseError);
    await expect(getAnalysis("user-1", "song-1")).rejects.toMatchObject({
      statusCode: 403,
      message: "Zugriff verweigert",
    });
  });

  it("returns null when song has no analysis", async () => {
    mockSongFindUnique.mockResolvedValue({
      id: "song-1",
      userId: "user-1",
      analyse: null,
      emotionsTags: [],
      strophen: [],
    } as any);

    const result = await getAnalysis("user-1", "song-1");
    expect(result).toBeNull();
  });

  it("returns SongAnalyseResult when analysis exists", async () => {
    mockSongFindUnique.mockResolvedValue({
      id: "song-1",
      userId: "user-1",
      analyse: "Eine tiefgründige Analyse",
      emotionsTags: ["Melancholie", "Sehnsucht"],
      strophen: [
        { id: "strophe-1", name: "Vers 1", orderIndex: 0, analyse: "Strophe 1 Analyse" },
        { id: "strophe-2", name: "Refrain", orderIndex: 1, analyse: "Refrain Analyse" },
      ],
    } as any);

    const result = await getAnalysis("user-1", "song-1");

    expect(result).toEqual({
      songAnalyse: "Eine tiefgründige Analyse",
      emotionsTags: ["Melancholie", "Sehnsucht"],
      strophenAnalysen: [
        { stropheId: "strophe-1", analyse: "Strophe 1 Analyse" },
        { stropheId: "strophe-2", analyse: "Refrain Analyse" },
      ],
    });
  });

  it("only includes strophen that have an analyse", async () => {
    mockSongFindUnique.mockResolvedValue({
      id: "song-1",
      userId: "user-1",
      analyse: "Song Analyse",
      emotionsTags: ["Freude"],
      strophen: [
        { id: "strophe-1", name: "Vers 1", orderIndex: 0, analyse: "Analyse vorhanden" },
        { id: "strophe-2", name: "Vers 2", orderIndex: 1, analyse: null },
        { id: "strophe-3", name: "Refrain", orderIndex: 2, analyse: "Auch vorhanden" },
      ],
    } as any);

    const result = await getAnalysis("user-1", "song-1");

    expect(result).not.toBeNull();
    expect(result!.strophenAnalysen).toHaveLength(2);
    expect(result!.strophenAnalysen[0].stropheId).toBe("strophe-1");
    expect(result!.strophenAnalysen[1].stropheId).toBe("strophe-3");
  });

  it("loads song with strophen ordered by orderIndex", async () => {
    mockSongFindUnique.mockResolvedValue({
      id: "song-1",
      userId: "user-1",
      analyse: "Analyse",
      emotionsTags: [],
      strophen: [],
    } as any);

    await getAnalysis("user-1", "song-1");

    expect(mockSongFindUnique).toHaveBeenCalledWith({
      where: { id: "song-1" },
      include: {
        strophen: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });
  });
});
