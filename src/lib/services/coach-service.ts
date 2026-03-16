import type { LLMMessage } from "./llm-client";
import { createLLMClient } from "./llm-client";
import type { ProfileData } from "@/types/profile";
import type { CoachResult } from "@/types/profile";
import { prisma } from "@/lib/prisma";

// --- Types for prompt building ---

interface CoachSongData {
  titel: string;
  kuenstler?: string | null;
}

// --- Custom Error ---

export class CoachError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "CoachError";
    this.statusCode = statusCode;
  }
}

// --- Prompt Builder ---

const SYSTEM_PROMPT =
  "Du bist ein erfahrener Gesangscoach. Du gibst personalisierte Tipps und Übungsempfehlungen " +
  "basierend auf dem Profil des Sängers/der Sängerin und dem gewählten Song. " +
  "Antworte auf Deutsch in einem zusammenhängenden Freitext.";

export function buildCoachPrompt(profile: ProfileData, song: CoachSongData): LLMMessage[] {
  let userPrompt = `Ich bin ${profile.geschlecht} und singe Songs im Genre ${profile.genre || "unbekannt"}.\n`;
  userPrompt += `Meine Stimmlage ist ${profile.stimmlage}, mein Niveau ist ${profile.erfahrungslevel}.\n`;
  userPrompt += `Ich möchte neue Songs lernen. Du bist mein Coach.\n\n`;
  userPrompt += `Es geht um folgenden Song: ${song.titel}`;
  if (song.kuenstler) {
    userPrompt += ` von ${song.kuenstler}`;
  }
  userPrompt += "\n\n";

  userPrompt += `Liefere mir folgende Informationen zum Gesang des Songs:\n`;
  userPrompt += `- Wie anspruchsvoll ist der Song zu singen für mich\n`;
  userPrompt += `- Wie wird der Song allgemein gesungen (Kopfstimme, Bruststimme, etc.)\n`;
  userPrompt += `- Was sind typische Charakteristiken, wie der Originalkünstler den Song singt\n`;
  userPrompt += `- Was sind schwierige Passagen\n`;
  userPrompt += `- Wie kann ich den Song am besten üben? (Welche allgemeinen Übungen bieten sich an, `;
  userPrompt += `um bestimmte Passagen zu üben, wie kann ich die Charakteristik des Interpreten gut imitieren.)`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

// --- Response Validation ---

export function validateCoachResponse(response: string): string {
  if (!response || typeof response !== "string" || response.trim().length === 0) {
    throw new Error("Die Coach-Antwort ist leer.");
  }
  return response.trim();
}

// --- generateCoachTipp ---

export async function generateCoachTipp(
  userId: string,
  songId: string
): Promise<CoachResult> {
  // 1. Load song
  const song = await prisma.song.findUnique({
    where: { id: songId },
  });

  if (!song) {
    throw new CoachError("Song nicht gefunden", 404);
  }

  // 2. Ownership check
  if (song.userId !== userId) {
    throw new CoachError("Zugriff verweigert", 403);
  }

  // 3. Load user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      alter: true,
      geschlecht: true,
      erfahrungslevel: true,
      stimmlage: true,
      genre: true,
    },
  });

  if (!user) {
    throw new CoachError("Benutzer nicht gefunden", 404);
  }

  const profile = user as ProfileData;

  // 4. Profile completeness check
  if (!profile.geschlecht || !profile.erfahrungslevel || !profile.stimmlage) {
    throw new CoachError(
      "Bitte vervollständige zuerst dein Profil (Geschlecht, Erfahrungslevel und Stimmlage sind erforderlich).",
      400
    );
  }

  try {
    // 5. Build prompt
    const messages = buildCoachPrompt(profile, {
      titel: song.titel,
      kuenstler: song.kuenstler,
    });

    // 6. Call LLM with text response format
    let llmClient;
    try {
      llmClient = createLLMClient({ responseFormat: "text" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[CoachService] ${new Date().toISOString()} LLM-Client-Erstellung fehlgeschlagen für Song ${songId}, User ${userId}: ${message}`
      );
      throw new CoachError(
        "Die Coach-Analyse konnte nicht gestartet werden. Bitte prüfe die LLM-Konfiguration.",
        500
      );
    }
    let rawResponse: string;
    try {
      rawResponse = await llmClient.chat(messages);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes("timeout") ||
        message.includes("Timeout") ||
        message.includes("ETIMEDOUT") ||
        message.includes("ECONNABORTED")
      ) {
        console.error(
          `[CoachService] ${new Date().toISOString()} Fehler bei Song ${songId}, User ${userId}: Timeout - ${message}`
        );
        throw new CoachError(
          "Die Coach-Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
          500
        );
      }

      if (
        message.includes("429") ||
        message.includes("Rate") ||
        message.includes("rate")
      ) {
        console.error(
          `[CoachService] ${new Date().toISOString()} Fehler bei Song ${songId}, User ${userId}: Rate-Limit - ${message}`
        );
        throw new CoachError(
          "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
          429
        );
      }

      console.error(
        `[CoachService] ${new Date().toISOString()} Fehler bei Song ${songId}, User ${userId}: LLM-Fehler - ${message}`,
        error
      );
      throw new CoachError(
        "Die Coach-Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
        500
      );
    }

    // 7. Validate response
    let validatedTipp: string;
    try {
      validatedTipp = validateCoachResponse(rawResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[CoachService] ${new Date().toISOString()} Fehler bei Song ${songId}, User ${userId}: Leere Antwort - ${message}`
      );
      throw new CoachError(
        "Die Coach-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.",
        500
      );
    }

    // 8. Save coachTipp on song
    await prisma.song.update({
      where: { id: songId },
      data: { coachTipp: validatedTipp },
    });

    return { coachTipp: validatedTipp };
  } catch (error) {
    if (error instanceof CoachError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[CoachService] ${new Date().toISOString()} Unerwarteter Fehler bei Song ${songId}, User ${userId}: ${message}`
    );
    throw new CoachError(
      "Die Coach-Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
      500
    );
  }
}
