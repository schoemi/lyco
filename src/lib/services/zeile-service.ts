import { prisma } from "@/lib/prisma";
import type {
  CreateZeileInput,
  UpdateZeileInput,
  ReorderItem,
  ZeileDetail,
  MarkupResponse,
} from "../../types/song";

function mapZeile(z: {
  id: string;
  text: string;
  uebersetzung: string | null;
  orderIndex: number;
  markups: { id: string; typ: string; ziel: string; wert: string | null; timecodeMs: number | null; wortIndex: number | null }[];
}): ZeileDetail {
  return {
    id: z.id,
    text: z.text,
    uebersetzung: z.uebersetzung,
    orderIndex: z.orderIndex,
    markups: z.markups.map(
      (m): MarkupResponse => ({
        id: m.id,
        typ: m.typ as MarkupResponse["typ"],
        ziel: m.ziel as MarkupResponse["ziel"],
        wert: m.wert,
        timecodeMs: m.timecodeMs,
        wortIndex: m.wortIndex,
      })
    ),
  };
}

async function verifySongOwnership(userId: string, songId: string) {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }
  return song;
}

async function verifyStropheBelongsToSong(stropheId: string, songId: string) {
  const strophe = await prisma.strophe.findUnique({ where: { id: stropheId } });
  if (!strophe) {
    throw new Error("Strophe nicht gefunden");
  }
  if (strophe.songId !== songId) {
    throw new Error("Strophe nicht gefunden");
  }
  return strophe;
}

async function verifyZeileBelongsToStrophe(zeileId: string, stropheId: string) {
  const zeile = await prisma.zeile.findUnique({ where: { id: zeileId } });
  if (!zeile) {
    throw new Error("Zeile nicht gefunden");
  }
  if (zeile.stropheId !== stropheId) {
    throw new Error("Zeile nicht gefunden");
  }
  return zeile;
}

export async function createZeile(
  userId: string,
  songId: string,
  stropheId: string,
  data: CreateZeileInput
): Promise<ZeileDetail> {
  await verifySongOwnership(userId, songId);
  await verifyStropheBelongsToSong(stropheId, songId);

  if (!data.text || !data.text.trim()) {
    throw new Error("Text ist erforderlich");
  }

  // Auto-assign next orderIndex within the strophe
  const maxOrder = await prisma.zeile.aggregate({
    where: { stropheId },
    _max: { orderIndex: true },
  });
  const nextOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  const created = await prisma.zeile.create({
    data: {
      text: data.text.trim(),
      uebersetzung: data.uebersetzung ?? null,
      orderIndex: nextOrderIndex,
      stropheId,
    },
    include: { markups: true },
  });

  return mapZeile(created);
}

export async function updateZeile(
  userId: string,
  songId: string,
  stropheId: string,
  zeileId: string,
  data: UpdateZeileInput
): Promise<ZeileDetail> {
  await verifySongOwnership(userId, songId);
  await verifyStropheBelongsToSong(stropheId, songId);
  await verifyZeileBelongsToStrophe(zeileId, stropheId);

  if (data.text !== undefined && (!data.text || !data.text.trim())) {
    throw new Error("Text ist erforderlich");
  }

  const updateData: Record<string, unknown> = {};
  if (data.text !== undefined) updateData.text = data.text.trim();
  if (data.uebersetzung !== undefined) updateData.uebersetzung = data.uebersetzung;

  const updated = await prisma.zeile.update({
    where: { id: zeileId },
    data: updateData,
    include: { markups: true },
  });

  return mapZeile(updated);
}

export async function deleteZeile(
  userId: string,
  songId: string,
  stropheId: string,
  zeileId: string
): Promise<void> {
  await verifySongOwnership(userId, songId);
  await verifyStropheBelongsToSong(stropheId, songId);
  await verifyZeileBelongsToStrophe(zeileId, stropheId);

  // Prisma cascade delete handles markups via schema relations
  await prisma.zeile.delete({ where: { id: zeileId } });
}

export async function reorderZeilen(
  userId: string,
  songId: string,
  stropheId: string,
  order: ReorderItem[]
): Promise<void> {
  await verifySongOwnership(userId, songId);
  await verifyStropheBelongsToSong(stropheId, songId);

  if (!Array.isArray(order) || order.length === 0) {
    throw new Error("Reihenfolge ist erforderlich");
  }

  // Validate all zeilen belong to this strophe
  const zeilen = await prisma.zeile.findMany({
    where: { stropheId },
    select: { id: true },
  });
  const zeileIds = new Set(zeilen.map((z) => z.id));

  for (const item of order) {
    if (!item.id || typeof item.orderIndex !== "number") {
      throw new Error("Ungültiges Reihenfolge-Element");
    }
    if (!zeileIds.has(item.id)) {
      throw new Error("Zeile nicht gefunden");
    }
  }

  // Batch update in a transaction
  await prisma.$transaction(
    order.map((item) =>
      prisma.zeile.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      })
    )
  );
}
