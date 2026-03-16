import { prisma } from "@/lib/prisma";
import type { Wiederholung } from "@/generated/prisma/client";
import { berechneIntervall } from "@/lib/spaced-repetition/algorithmus";

export interface FaelligeStrophe {
  wiederholungId: string;
  stropheId: string;
  stropheName: string;
  songTitel: string;
  songId: string;
  korrektZaehler: number;
  zeilen: { text: string; orderIndex: number }[];
}

/**
 * Liefert alle heute fälligen Strophen für einen Nutzer.
 */
export async function getFaelligeStrophen(
  userId: string
): Promise<FaelligeStrophe[]> {
  const heute = new Date();
  heute.setHours(23, 59, 59, 999);

  const wiederholungen = await prisma.wiederholung.findMany({
    where: {
      userId,
      faelligAm: { lte: heute },
    },
    include: {
      strophe: {
        include: {
          song: true,
          zeilen: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  return wiederholungen.map((w) => ({
    wiederholungId: w.id,
    stropheId: w.strophe.id,
    stropheName: w.strophe.name,
    songTitel: w.strophe.song.titel,
    songId: w.strophe.song.id,
    korrektZaehler: w.korrektZaehler,
    zeilen: w.strophe.zeilen.map((z) => ({
      text: z.text,
      orderIndex: z.orderIndex,
    })),
  }));
}


/**
 * Liefert fällige Strophen für einen bestimmten Song.
 */
export async function getFaelligeStrophenFuerSong(
  userId: string,
  songId: string
): Promise<FaelligeStrophe[]> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  const heute = new Date();
  heute.setHours(23, 59, 59, 999);

  const wiederholungen = await prisma.wiederholung.findMany({
    where: {
      userId,
      faelligAm: { lte: heute },
      strophe: { songId },
    },
    include: {
      strophe: {
        include: {
          song: true,
          zeilen: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  return wiederholungen.map((w) => ({
    wiederholungId: w.id,
    stropheId: w.strophe.id,
    stropheName: w.strophe.name,
    songTitel: w.strophe.song.titel,
    songId: w.strophe.song.id,
    korrektZaehler: w.korrektZaehler,
    zeilen: w.strophe.zeilen.map((z) => ({
      text: z.text,
      orderIndex: z.orderIndex,
    })),
  }));
}

/**
 * Liefert die Gesamtzahl fälliger Strophen für einen Nutzer.
 */
export async function getFaelligeAnzahl(userId: string): Promise<number> {
  const heute = new Date();
  heute.setHours(23, 59, 59, 999);

  return prisma.wiederholung.count({
    where: {
      userId,
      faelligAm: { lte: heute },
    },
  });
}

/**
 * Erstellt einen neuen Wiederholungs-Eintrag (Strophe ins System aufnehmen).
 */
export async function erstelleWiederholung(
  userId: string,
  stropheId: string
): Promise<Wiederholung> {
  const strophe = await prisma.strophe.findUnique({
    where: { id: stropheId },
    include: { song: true },
  });
  if (!strophe) {
    throw new Error("Strophe nicht gefunden");
  }
  if (strophe.song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.wiederholung.create({
    data: {
      userId,
      stropheId,
      korrektZaehler: 0,
      faelligAm: new Date(),
    },
  });
}

/**
 * Verarbeitet eine Bewertung und aktualisiert den Wiederholungs-Eintrag.
 */
export async function verarbeiteReview(
  wiederholungId: string,
  userId: string,
  gewusst: boolean
): Promise<{ naechstesFaelligkeitsdatum: Date; intervallTage: number }> {
  const wiederholung = await prisma.wiederholung.findUnique({
    where: { id: wiederholungId },
  });
  if (!wiederholung) {
    throw new Error("Wiederholung nicht gefunden");
  }
  if (wiederholung.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  const { neuerKorrektZaehler, intervallTage } = berechneIntervall(
    wiederholung.korrektZaehler,
    gewusst
  );

  const naechstesFaelligkeitsdatum = new Date();
  naechstesFaelligkeitsdatum.setDate(
    naechstesFaelligkeitsdatum.getDate() + intervallTage
  );

  await prisma.wiederholung.update({
    where: { id: wiederholungId },
    data: {
      korrektZaehler: neuerKorrektZaehler,
      faelligAm: naechstesFaelligkeitsdatum,
    },
  });

  return { naechstesFaelligkeitsdatum, intervallTage };
}
