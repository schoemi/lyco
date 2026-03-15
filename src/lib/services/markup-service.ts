import { prisma } from "@/lib/prisma";
import { MarkupZiel } from "@/generated/prisma/client";
import type { Markup } from "@/generated/prisma/client";
import type {
  CreateMarkupInput,
  UpdateMarkupInput,
  MarkupResponse,
} from "../../types/song";

interface MarkupGrouped {
  [stropheId: string]: {
    stropheMarkups: MarkupResponse[];
    zeilen: {
      [zeileId: string]: MarkupResponse[];
    };
  };
}

export async function createMarkup(
  userId: string,
  data: CreateMarkupInput
): Promise<Markup> {
  // Validate target references based on ziel
  if (data.ziel === MarkupZiel.STROPHE) {
    if (!data.stropheId) {
      throw new Error("Für Ziel STROPHE muss stropheId gesetzt sein");
    }
    const strophe = await prisma.strophe.findUnique({
      where: { id: data.stropheId },
      include: { song: true },
    });
    if (!strophe) {
      throw new Error("Strophe nicht gefunden");
    }
    if (strophe.song.userId !== userId) {
      throw new Error("Zugriff verweigert");
    }

    return prisma.markup.create({
      data: {
        typ: data.typ,
        ziel: data.ziel,
        wert: data.wert ?? null,
        timecodeMs: data.timecodeMs ?? null,
        wortIndex: null,
        stropheId: data.stropheId,
        zeileId: null,
      },
    });
  }

  if (data.ziel === MarkupZiel.ZEILE) {
    if (!data.zeileId) {
      throw new Error("Für Ziel ZEILE muss zeileId gesetzt sein");
    }
    const zeile = await prisma.zeile.findUnique({
      where: { id: data.zeileId },
      include: { strophe: { include: { song: true } } },
    });
    if (!zeile) {
      throw new Error("Zeile nicht gefunden");
    }
    if (zeile.strophe.song.userId !== userId) {
      throw new Error("Zugriff verweigert");
    }

    return prisma.markup.create({
      data: {
        typ: data.typ,
        ziel: data.ziel,
        wert: data.wert ?? null,
        timecodeMs: data.timecodeMs ?? null,
        wortIndex: null,
        stropheId: null,
        zeileId: data.zeileId,
      },
    });
  }

  // WORT
  if (!data.zeileId) {
    throw new Error("Für Ziel WORT muss zeileId gesetzt sein");
  }
  if (data.wortIndex === undefined || data.wortIndex === null) {
    throw new Error("Für Ziel WORT muss wortIndex gesetzt sein");
  }

  const zeile = await prisma.zeile.findUnique({
    where: { id: data.zeileId },
    include: { strophe: { include: { song: true } } },
  });
  if (!zeile) {
    throw new Error("Zeile nicht gefunden");
  }
  if (zeile.strophe.song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  // Validate wortIndex range
  const words = zeile.text.split(/\s+/).filter((w) => w.length > 0);
  if (data.wortIndex < 0 || data.wortIndex >= words.length) {
    throw new Error("Wort-Index außerhalb des gültigen Bereichs");
  }

  return prisma.markup.create({
    data: {
      typ: data.typ,
      ziel: data.ziel,
      wert: data.wert ?? null,
      timecodeMs: data.timecodeMs ?? null,
      wortIndex: data.wortIndex,
      stropheId: null,
      zeileId: data.zeileId,
    },
  });
}

export async function updateMarkup(
  userId: string,
  markupId: string,
  data: UpdateMarkupInput
): Promise<Markup> {
  const markup = await prisma.markup.findUnique({
    where: { id: markupId },
    include: {
      strophe: { include: { song: true } },
      zeile: { include: { strophe: { include: { song: true } } } },
    },
  });
  if (!markup) {
    throw new Error("Markup nicht gefunden");
  }

  // Ownership check via song
  const song = markup.strophe?.song ?? markup.zeile?.strophe?.song;
  if (!song || song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  const updateData: Record<string, unknown> = {};
  if (data.wert !== undefined) updateData.wert = data.wert;
  if (data.timecodeMs !== undefined) updateData.timecodeMs = data.timecodeMs;

  return prisma.markup.update({
    where: { id: markupId },
    data: updateData,
  });
}

export async function deleteMarkup(
  userId: string,
  markupId: string
): Promise<void> {
  const markup = await prisma.markup.findUnique({
    where: { id: markupId },
    include: {
      strophe: { include: { song: true } },
      zeile: { include: { strophe: { include: { song: true } } } },
    },
  });
  if (!markup) {
    throw new Error("Markup nicht gefunden");
  }

  const song = markup.strophe?.song ?? markup.zeile?.strophe?.song;
  if (!song || song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.markup.delete({ where: { id: markupId } });
}

export async function getMarkupsForSong(
  userId: string,
  songId: string
): Promise<MarkupGrouped> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  const strophen = await prisma.strophe.findMany({
    where: { songId },
    orderBy: { orderIndex: "asc" },
    include: {
      markups: true,
      zeilen: {
        orderBy: { orderIndex: "asc" },
        include: { markups: true },
      },
    },
  });

  const grouped: MarkupGrouped = {};

  for (const strophe of strophen) {
    const stropheMarkups: MarkupResponse[] = strophe.markups.map((m) => ({
      id: m.id,
      typ: m.typ,
      ziel: m.ziel,
      wert: m.wert,
      timecodeMs: m.timecodeMs,
      wortIndex: m.wortIndex,
    }));

    const zeilenMarkups: { [zeileId: string]: MarkupResponse[] } = {};
    for (const zeile of strophe.zeilen) {
      if (zeile.markups.length > 0) {
        zeilenMarkups[zeile.id] = zeile.markups.map((m) => ({
          id: m.id,
          typ: m.typ,
          ziel: m.ziel,
          wert: m.wert,
          timecodeMs: m.timecodeMs,
          wortIndex: m.wortIndex,
        }));
      }
    }

    grouped[strophe.id] = {
      stropheMarkups,
      zeilen: zeilenMarkups,
    };
  }

  return grouped;
}
