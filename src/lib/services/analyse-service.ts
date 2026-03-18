import type { LLMMessage } from "./llm-client";
import { createLLMClient } from "./llm-client";
import type { SongAnalyseResult } from "@/types/song";
import { prisma } from "@/lib/prisma";

// --- Types for prompt building ---

interface PromptStrophe {
  name: string;
  zeilen: { text: string }[];
}

interface PromptSong {
  titel: string;
  kuenstler?: string | null;
  strophen: PromptStrophe[];
}

// --- Prompt Builder ---

const SYSTEM_PROMPT_TEMPLATE = (sprache: string) =>
  "Du bist ein erfahrener Songtext-Analyst mit Fokus auf emotionale Bedeutung.\n" +
  "Analysiere den folgenden Songtext und liefere deine Analyse als JSON-Objekt.\n" +
  `Antworte auf ${sprache}.`;

const JSON_TEMPLATE =
  `Liefere ein JSON-Objekt mit folgender Struktur:
{
  "songAnalyse": "Allgemeine Analyse: emotionaler Hintergrund, zentrale Botschaft, Stimmung",
  "emotionsTags": ["Tag1", "Tag2", ...],
  "strophenAnalysen": [
    { "stropheIndex": 0, "analyse": "Emotionale Bedeutung, Beitrag zur Gesamtbotschaft, Stilmittel" },
    ...
  ]
}`;

export function buildAnalysePrompt(song: PromptSong, sprache: string = "Deutsch"): LLMMessage[] {
  const nonEmptyStrophen = song.strophen.filter(
    (s) => s.zeilen && s.zeilen.length > 0
  );

  let userPrompt = `Titel: ${song.titel}\n`;
  if (song.kuenstler) {
    userPrompt += `Künstler: ${song.kuenstler}\n`;
  }

  userPrompt += "\nSongtext:\n";

  nonEmptyStrophen.forEach((strophe, index) => {
    userPrompt += `[Strophe ${index + 1}: ${strophe.name}]\n`;
    strophe.zeilen.forEach((zeile) => {
      userPrompt += `${zeile.text}\n`;
    });
    userPrompt += "\n";
  });

  userPrompt += JSON_TEMPLATE;

  return [
    { role: "system", content: SYSTEM_PROMPT_TEMPLATE(sprache) },
    { role: "user", content: userPrompt },
  ];
}


// --- Response Validation ---

interface RawStropheAnalyse {
  stropheIndex: number;
  analyse: string;
}

interface RawAnalyseResponse {
  songAnalyse: string;
  emotionsTags: string[];
  strophenAnalysen: RawStropheAnalyse[];
}

export function validateAnalyseResponse(
  raw: string,
  strophenCount: number
): RawAnalyseResponse {
  // Strip markdown code fences if present (LLMs often wrap JSON in ```json ... ```)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Die Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut."
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      "Die Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut."
    );
  }

  const obj = parsed as Record<string, unknown>;

  // songAnalyse: non-empty string
  if (typeof obj.songAnalyse !== "string" || obj.songAnalyse.trim() === "") {
    throw new Error(
      "Ungültige Antwort: songAnalyse muss ein nicht-leerer String sein."
    );
  }

  // emotionsTags: array of strings
  if (!Array.isArray(obj.emotionsTags)) {
    throw new Error(
      "Ungültige Antwort: emotionsTags muss ein Array sein."
    );
  }
  if (!obj.emotionsTags.every((tag: unknown) => typeof tag === "string")) {
    throw new Error(
      "Ungültige Antwort: emotionsTags muss ein Array von Strings sein."
    );
  }

  // strophenAnalysen: array with correct structure and count
  if (!Array.isArray(obj.strophenAnalysen)) {
    throw new Error(
      "Ungültige Antwort: strophenAnalysen muss ein Array sein."
    );
  }

  for (const item of obj.strophenAnalysen as unknown[]) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(
        "Ungültige Antwort: strophenAnalysen muss Objekte mit stropheIndex und analyse enthalten."
      );
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.stropheIndex !== "number") {
      throw new Error(
        "Ungültige Antwort: stropheIndex muss eine Zahl sein."
      );
    }
    if (typeof entry.analyse !== "string") {
      throw new Error(
        "Ungültige Antwort: analyse muss ein String sein."
      );
    }
  }

  if (obj.strophenAnalysen.length !== strophenCount) {
    console.warn(
      `[AnalyseService] Strophen-Anzahl Mismatch: erwartet ${strophenCount}, erhalten ${obj.strophenAnalysen.length}. Wird toleriert.`
    );
  }

  return {
    songAnalyse: obj.songAnalyse as string,
    emotionsTags: obj.emotionsTags as string[],
    strophenAnalysen: obj.strophenAnalysen as RawStropheAnalyse[],
  };
}


// --- Custom Error ---

export class AnalyseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AnalyseError";
    this.statusCode = statusCode;
  }
}

// --- Concurrency Guard ---

export const activeAnalyses = new Set<string>();

// --- analyzeSong ---

export async function analyzeSong(
  userId: string,
  songId: string
): Promise<SongAnalyseResult> {
  // 1. Load song with strophen and zeilen
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      strophen: {
        orderBy: { orderIndex: "asc" },
        include: {
          zeilen: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  if (!song) {
    throw new AnalyseError("Song nicht gefunden", 404);
  }

  // 2. Ownership check
  if (song.userId !== userId) {
    throw new AnalyseError("Zugriff verweigert", 403);
  }

  // 2b. Load user sprache
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sprache: true },
  });
  const sprache = user?.sprache || "Deutsch";

  // 3. Check if song has strophen with zeilen
  const strophenWithZeilen = song.strophen.filter(
    (s) => s.zeilen && s.zeilen.length > 0
  );
  if (strophenWithZeilen.length === 0) {
    throw new AnalyseError(
      "Der Song enthält keine Strophen oder Zeilen zur Analyse.",
      400
    );
  }

  // 4. Concurrency guard
  if (activeAnalyses.has(songId)) {
    throw new AnalyseError(
      "Eine Analyse läuft bereits für diesen Song.",
      409
    );
  }

  activeAnalyses.add(songId);

  try {
    // 5. Build prompt
    const messages = buildAnalysePrompt({
      titel: song.titel,
      kuenstler: song.kuenstler,
      strophen: strophenWithZeilen.map((s) => ({
        name: s.name,
        zeilen: s.zeilen.map((z) => ({ text: z.text })),
      })),
    }, sprache);

    // 6. Call LLM
    const llmClient = createLLMClient();
    let rawResponse: string;
    try {
      rawResponse = await llmClient.chat(messages);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (message.includes("timeout") || message.includes("Timeout") || message.includes("ETIMEDOUT") || message.includes("ECONNABORTED")) {
        console.error(
          `[AnalyseService] Fehler bei Song ${songId}: Timeout - ${message}`
        );
        throw new AnalyseError(
          "Die Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
          500
        );
      }

      if (message.includes("429") || message.includes("Rate") || message.includes("rate")) {
        console.error(
          `[AnalyseService] Fehler bei Song ${songId}: Rate-Limit - ${message}`
        );
        throw new AnalyseError(
          "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
          429
        );
      }

      console.error(
        `[AnalyseService] Fehler bei Song ${songId}: LLM-Fehler - ${message}`
      );
      throw new AnalyseError(
        "Die Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
        500
      );
    }

    // 7. Validate response
    let validated;
    try {
      validated = validateAnalyseResponse(rawResponse, strophenWithZeilen.length);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[AnalyseService] Fehler bei Song ${songId}: Ungültiges JSON - ${message}`
      );
      console.error(
        `[AnalyseService] LLM-Rohantwort (erste 500 Zeichen): ${rawResponse.substring(0, 500)}`
      );
      console.error(
        `[AnalyseService] Erwartete Strophen: ${strophenWithZeilen.length}`
      );
      throw new AnalyseError(
        "Die Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut.",
        500
      );
    }

    // 8. Save song analyse and emotionsTags
    await prisma.song.update({
      where: { id: songId },
      data: {
        analyse: validated.songAnalyse,
        emotionsTags: validated.emotionsTags,
      },
    });

    // 9. Save strophen analyses
    const strophenAnalysen: SongAnalyseResult["strophenAnalysen"] = [];

    for (const sa of validated.strophenAnalysen) {
      const strophe = strophenWithZeilen[sa.stropheIndex];
      if (strophe) {
        await prisma.strophe.update({
          where: { id: strophe.id },
          data: { analyse: sa.analyse },
        });
        strophenAnalysen.push({
          stropheId: strophe.id,
          analyse: sa.analyse,
        });
      }
    }

    // 11. Return result
    return {
      songAnalyse: validated.songAnalyse,
      emotionsTags: validated.emotionsTags,
      strophenAnalysen,
    };
  } finally {
    // 10. Release concurrency guard
    activeAnalyses.delete(songId);
  }
}

// --- getAnalysis ---

export async function getAnalysis(
  userId: string,
  songId: string
): Promise<SongAnalyseResult | null> {
  // 1. Load song with strophen (include analyse fields)
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      strophen: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  // 2. Song not found
  if (!song) {
    throw new AnalyseError("Song nicht gefunden", 404);
  }

  // 3. Ownership check
  if (song.userId !== userId) {
    throw new AnalyseError("Zugriff verweigert", 403);
  }

  // 4. No analysis yet
  if (song.analyse === null) {
    return null;
  }

  // 5. Build and return SongAnalyseResult
  const strophenAnalysen: SongAnalyseResult["strophenAnalysen"] = song.strophen
    .filter((s) => s.analyse !== null)
    .map((s) => ({
      stropheId: s.id,
      analyse: s.analyse!,
    }));

  return {
    songAnalyse: song.analyse,
    emotionsTags: song.emotionsTags,
    strophenAnalysen,
  };
}
