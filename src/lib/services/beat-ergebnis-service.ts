/**
 * Service-Layer für BeatErgebnis-Operationen.
 *
 * - getBeatErgebnis: BeatErgebnis für einen Song laden
 * - upsertBeatErgebnis: BeatErgebnis erstellen oder aktualisieren (Upsert)
 *
 * Anforderungen: 6.1, 6.3, 6.4, 6.5
 */

import { prisma } from "@/lib/prisma";
import type { BeatErgebnisResponse, BeatErgebnisSpeichernInput } from "@/types/beat-detection";

/**
 * Verifies that the song exists and belongs to the given user.
 * Throws "Song nicht gefunden" or "Zugriff verweigert" on failure.
 */
async function verifySongOwnership(
  songId: string,
  userId: string,
): Promise<void> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { userId: true },
  });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }
}

/**
 * Validates the BeatErgebnisSpeichernInput.
 * Throws descriptive error messages on invalid input.
 */
function validateInput(input: BeatErgebnisSpeichernInput): void {
  // bpm: integer in [20, 300]
  if (
    input.bpm === undefined ||
    input.bpm === null ||
    typeof input.bpm !== "number" ||
    !Number.isInteger(input.bpm) ||
    input.bpm < 20 ||
    input.bpm > 300
  ) {
    throw new Error("BPM muss zwischen 20 und 300 liegen");
  }

  // methode: AUTOMATISCH or MANUELL
  if (!input.methode || (input.methode !== "AUTOMATISCH" && input.methode !== "MANUELL")) {
    throw new Error("Methode muss AUTOMATISCH oder MANUELL sein");
  }

  // beatPositionenMs: array of non-negative integers
  if (!Array.isArray(input.beatPositionenMs)) {
    throw new Error("beatPositionenMs muss ein Array sein");
  }
  for (const pos of input.beatPositionenMs) {
    if (typeof pos !== "number" || !Number.isInteger(pos) || pos < 0) {
      throw new Error("beatPositionenMs muss ein Array von nicht-negativen Ganzzahlen sein");
    }
  }

  // konfidenz: optional, but if present must be in [0, 100]
  if (input.konfidenz !== undefined && input.konfidenz !== null) {
    if (
      typeof input.konfidenz !== "number" ||
      !Number.isInteger(input.konfidenz) ||
      input.konfidenz < 0 ||
      input.konfidenz > 100
    ) {
      throw new Error("Konfidenz muss zwischen 0 und 100 liegen");
    }
  }

  // frequenzUntergrenze: optional, but if present must be in [20, 20000]
  if (input.frequenzUntergrenze !== undefined && input.frequenzUntergrenze !== null) {
    if (
      typeof input.frequenzUntergrenze !== "number" ||
      !Number.isInteger(input.frequenzUntergrenze) ||
      input.frequenzUntergrenze < 20 ||
      input.frequenzUntergrenze > 20000
    ) {
      throw new Error("Frequenzuntergrenze muss zwischen 20 und 20000 liegen");
    }
  }

  // frequenzObergrenze: optional, but if present must be in [20, 20000]
  if (input.frequenzObergrenze !== undefined && input.frequenzObergrenze !== null) {
    if (
      typeof input.frequenzObergrenze !== "number" ||
      !Number.isInteger(input.frequenzObergrenze) ||
      input.frequenzObergrenze < 20 ||
      input.frequenzObergrenze > 20000
    ) {
      throw new Error("Frequenzobergrenze muss zwischen 20 und 20000 liegen");
    }
  }

  // If both frequency bounds are present, lower must be less than upper
  if (
    input.frequenzUntergrenze !== undefined &&
    input.frequenzUntergrenze !== null &&
    input.frequenzObergrenze !== undefined &&
    input.frequenzObergrenze !== null &&
    input.frequenzUntergrenze >= input.frequenzObergrenze
  ) {
    throw new Error("Frequenzuntergrenze muss kleiner als Frequenzobergrenze sein");
  }
}

/**
 * Maps a Prisma BeatErgebnis record to a BeatErgebnisResponse.
 */
function mapToResponse(record: {
  id: string;
  songId: string;
  bpm: number;
  methode: string;
  konfidenz: number | null;
  beatPositionenMs: number[];
  frequenzUntergrenze: number | null;
  frequenzObergrenze: number | null;
  offsetMs: number;
  taktZaehler: number;
  taktNenner: number;
}): BeatErgebnisResponse {
  return {
    id: record.id,
    songId: record.songId,
    bpm: record.bpm,
    methode: record.methode as "AUTOMATISCH" | "MANUELL",
    konfidenz: record.konfidenz,
    beatPositionenMs: record.beatPositionenMs,
    frequenzUntergrenze: record.frequenzUntergrenze,
    frequenzObergrenze: record.frequenzObergrenze,
    offsetMs: record.offsetMs,
    taktZaehler: record.taktZaehler,
    taktNenner: record.taktNenner,
  };
}

/**
 * Loads the BeatErgebnis for a song.
 *
 * @param songId - The song ID
 * @param userId - The requesting user's ID (for ownership check)
 * @returns The BeatErgebnisResponse or null if none exists
 */
export async function getBeatErgebnis(
  songId: string,
  userId: string,
): Promise<BeatErgebnisResponse | null> {
  await verifySongOwnership(songId, userId);

  const record = await prisma.beatErgebnis.findUnique({
    where: { songId },
  });

  if (!record) return null;

  return mapToResponse(record);
}

/**
 * Creates or updates the BeatErgebnis for a song (upsert).
 *
 * @param songId - The song ID
 * @param input - The BeatErgebnisSpeichernInput
 * @param userId - The requesting user's ID (for ownership check)
 * @returns The upserted BeatErgebnisResponse
 */
export async function upsertBeatErgebnis(
  songId: string,
  input: BeatErgebnisSpeichernInput,
  userId: string,
): Promise<BeatErgebnisResponse> {
  await verifySongOwnership(songId, userId);
  validateInput(input);

  const data = {
    bpm: input.bpm,
    methode: input.methode,
    konfidenz: input.konfidenz ?? null,
    beatPositionenMs: input.beatPositionenMs,
    frequenzUntergrenze: input.frequenzUntergrenze ?? null,
    frequenzObergrenze: input.frequenzObergrenze ?? null,
    offsetMs: input.offsetMs ?? 0,
    taktZaehler: input.taktZaehler ?? 4,
    taktNenner: input.taktNenner ?? 4,
  };

  const record = await prisma.beatErgebnis.upsert({
    where: { songId },
    create: {
      songId,
      ...data,
    },
    update: data,
  });

  return mapToResponse(record);
}
