import type { LLMMessage } from "./llm-client";
import { createLLMClient } from "./llm-client";
import type {
  UebersetzungResult,
  StropheUebersetzungResult,
  ZeileUebersetzungResult,
} from "@/types/song";
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

// --- Custom Error ---

export class UebersetzungsError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "UebersetzungsError";
    this.statusCode = statusCode;
  }
}

// --- Prompt Builder ---

const SYSTEM_PROMPT =
  "Du bist ein professioneller Songtext-Übersetzer. Übersetze Songtexte zeilenweise und bewahre dabei den poetischen Charakter und die emotionale Bedeutung des Originals.\n" +
  "Antworte ausschließlich als JSON-Objekt.";

const JSON_TEMPLATE = `Liefere ein JSON-Objekt mit folgender Struktur:
{
  "strophen": [
    {
      "stropheIndex": 0,
      "uebersetzungen": ["Übersetzung Zeile 1", "Übersetzung Zeile 2", ...]
    }
  ]
}

Wichtig:
- Jede Originalzeile muss genau einer Übersetzungszeile zugeordnet sein.
- Die Reihenfolge der Übersetzungszeilen muss exakt der Reihenfolge der Originalzeilen entsprechen.
- Bewahre den poetischen Charakter und die emotionale Bedeutung.`;


export function buildUebersetzungPrompt(
  song: PromptSong,
  zielsprache: string
): LLMMessage[] {
  const nonEmptyStrophen = song.strophen.filter(
    (s) => s.zeilen && s.zeilen.length > 0
  );

  let userPrompt = `Übersetze den folgenden Songtext ins ${zielsprache}.\n\n`;
  userPrompt += `Titel: ${song.titel}\n`;
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
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

// --- Response Validation ---

interface RawStropheUebersetzung {
  stropheIndex: number;
  uebersetzungen: string[];
}

interface RawUebersetzungResponse {
  strophen: RawStropheUebersetzung[];
}

export function validateUebersetzungResponse(
  raw: string,
  strophen: { zeilenCount: number }[]
): RawUebersetzungResponse {
  // Strip markdown code fences if present (LLMs often wrap JSON in ```json ... ```)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Die Übersetzung konnte nicht verarbeitet werden. Bitte versuche es erneut."
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      "Die Übersetzung konnte nicht verarbeitet werden. Bitte versuche es erneut."
    );
  }

  const obj = parsed as Record<string, unknown>;

  // strophen: must be an array
  if (!Array.isArray(obj.strophen)) {
    throw new Error(
      "Ungültige Antwort: strophen muss ein Array sein."
    );
  }

  // Validate each strophe element
  for (const item of obj.strophen as unknown[]) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(
        "Ungültige Antwort: Jedes Element in strophen muss ein Objekt mit stropheIndex und uebersetzungen enthalten."
      );
    }
    const entry = item as Record<string, unknown>;

    if (typeof entry.stropheIndex !== "number") {
      throw new Error(
        "Ungültige Antwort: stropheIndex muss eine Zahl sein."
      );
    }

    if (!Array.isArray(entry.uebersetzungen)) {
      throw new Error(
        "Ungültige Antwort: uebersetzungen muss ein Array sein."
      );
    }

    // Each translation must be a non-empty string
    for (const translation of entry.uebersetzungen as unknown[]) {
      if (typeof translation !== "string" || translation.trim() === "") {
        throw new Error(
          "Ungültige Antwort: Jede Übersetzungszeile muss ein nicht-leerer String sein."
        );
      }
    }
  }

  const strophenArray = obj.strophen as RawStropheUebersetzung[];

  // Check strophe count matches non-empty stanzas
  if (strophenArray.length !== strophen.length) {
    throw new Error(
      `Ungültige Antwort: Erwartete ${strophen.length} Strophen, aber ${strophenArray.length} erhalten.`
    );
  }

  // Check line count per strophe
  for (let i = 0; i < strophenArray.length; i++) {
    const expected = strophen[i].zeilenCount;
    const actual = strophenArray[i].uebersetzungen.length;
    if (actual !== expected) {
      throw new Error(
        `Ungültige Antwort: Strophe ${i} hat ${actual} Übersetzungszeilen, aber ${expected} erwartet.`
      );
    }
  }

  return { strophen: strophenArray };
}


// --- getTranslation ---

export async function getTranslation(
  userId: string,
  songId: string
): Promise<UebersetzungResult | null> {
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

  // 2. Song not found
  if (!song) {
    throw new UebersetzungsError("Song nicht gefunden", 404);
  }

  // 3. Ownership check
  if (song.userId !== userId) {
    throw new UebersetzungsError("Zugriff verweigert", 403);
  }

  // 4. Check if any zeile has a translation
  const hasAnyTranslation = song.strophen.some((s) =>
    s.zeilen.some((z) => z.uebersetzung !== null)
  );

  if (!hasAnyTranslation) {
    return null;
  }

  // 5. Build and return UebersetzungResult
  const strophen: StropheUebersetzungResult[] = song.strophen
    .filter((s) => s.zeilen.length > 0)
    .map((s) => ({
      stropheId: s.id,
      stropheName: s.name,
      zeilen: s.zeilen.map((z) => ({
        zeileId: z.id,
        originalText: z.text,
        uebersetzung: z.uebersetzung ?? "",
      })),
    }));

  return {
    songId,
    zielsprache: "Deutsch",
    strophen,
  };
}

// --- Concurrency Guard ---

export const activeTranslations = new Set<string>();

// --- translateSong ---

export async function translateSong(
  userId: string,
  songId: string,
  zielsprache?: string
): Promise<UebersetzungResult> {
  // 1. Validate zielsprache
  if (zielsprache !== undefined && zielsprache.trim() === "") {
    throw new UebersetzungsError(
      "Die Zielsprache darf nicht leer sein.",
      400
    );
  }
  const resolvedZielsprache = zielsprache ?? "Deutsch";

  // 2. Load song with strophen and zeilen
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
    throw new UebersetzungsError("Song nicht gefunden", 404);
  }

  // 3. Ownership check
  if (song.userId !== userId) {
    throw new UebersetzungsError("Zugriff verweigert", 403);
  }

  // 4. Check if song has strophen with zeilen
  const strophenWithZeilen = song.strophen.filter(
    (s) => s.zeilen && s.zeilen.length > 0
  );
  if (strophenWithZeilen.length === 0) {
    throw new UebersetzungsError(
      "Der Song enthält keine Strophen oder Zeilen zur Übersetzung.",
      400
    );
  }

  // 5. Concurrency guard
  if (activeTranslations.has(songId)) {
    throw new UebersetzungsError(
      "Eine Übersetzung läuft bereits für diesen Song.",
      409
    );
  }

  activeTranslations.add(songId);

  try {
    // 6. Build prompt
    const messages = buildUebersetzungPrompt(
      {
        titel: song.titel,
        kuenstler: song.kuenstler,
        strophen: strophenWithZeilen.map((s) => ({
          name: s.name,
          zeilen: s.zeilen.map((z) => ({ text: z.text })),
        })),
      },
      resolvedZielsprache
    );

    // 7. Call LLM
    const llmClient = createLLMClient();
    let rawResponse: string;
    try {
      rawResponse = await llmClient.chat(messages);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (
        message.includes("timeout") ||
        message.includes("Timeout") ||
        message.includes("ETIMEDOUT") ||
        message.includes("ECONNABORTED")
      ) {
        console.error(
          `[UebersetzungsService] Fehler bei Song ${songId}: Timeout - ${message}`
        );
        throw new UebersetzungsError(
          "Die Übersetzung konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
          500
        );
      }

      if (
        message.includes("429") ||
        message.includes("Rate") ||
        message.includes("rate")
      ) {
        console.error(
          `[UebersetzungsService] Fehler bei Song ${songId}: Rate-Limit - ${message}`
        );
        throw new UebersetzungsError(
          "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
          429
        );
      }

      console.error(
        `[UebersetzungsService] Fehler bei Song ${songId}: LLM-Fehler - ${message}`
      );
      throw new UebersetzungsError(
        "Die Übersetzung konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
        500
      );
    }

    // 8. Validate response
    let validated;
    try {
      validated = validateUebersetzungResponse(
        rawResponse,
        strophenWithZeilen.map((s) => ({ zeilenCount: s.zeilen.length }))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[UebersetzungsService] Fehler bei Song ${songId}: Ungültiges JSON - ${message}`
      );
      throw new UebersetzungsError(
        "Die Übersetzung konnte nicht verarbeitet werden. Bitte versuche es erneut.",
        500
      );
    }

    // 9. Save translations line-by-line and build result
    // Sort by stropheIndex to ensure correct positional mapping,
    // then use the sorted index to look up the actual strophe.
    const sortedStrophen = [...validated.strophen].sort(
      (a, b) => a.stropheIndex - b.stropheIndex
    );
    const strophenResult: StropheUebersetzungResult[] = [];

    for (let idx = 0; idx < sortedStrophen.length; idx++) {
      const stropheData = sortedStrophen[idx];
      const strophe = strophenWithZeilen[idx];
      if (!strophe) continue;

      const zeilenResult: ZeileUebersetzungResult[] = [];

      for (let i = 0; i < strophe.zeilen.length; i++) {
        const zeile = strophe.zeilen[i];
        const uebersetzung = stropheData.uebersetzungen[i];

        await prisma.zeile.update({
          where: { id: zeile.id },
          data: { uebersetzung },
        });

        zeilenResult.push({
          zeileId: zeile.id,
          originalText: zeile.text,
          uebersetzung,
        });
      }

      strophenResult.push({
        stropheId: strophe.id,
        stropheName: strophe.name,
        zeilen: zeilenResult,
      });
    }

    // 10. Return result
    return {
      songId,
      zielsprache: resolvedZielsprache,
      strophen: strophenResult,
    };
  } finally {
    // Release concurrency guard
    activeTranslations.delete(songId);
  }
}
