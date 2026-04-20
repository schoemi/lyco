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
  istKommentar: boolean;
  startTakt: number | null;
  endTakt: number | null;
  markups: { id: string; typ: string; ziel: string; wert: string | null; timecodeMs: number | null; wortIndex: number | null }[];
}): ZeileDetail {
  return {
    id: z.id,
    text: z.text,
    uebersetzung: z.uebersetzung,
    orderIndex: z.orderIndex,
    istKommentar: z.istKommentar,
    startTakt: z.startTakt,
    endTakt: z.endTakt,
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
  const bestehendeZeile = await verifyZeileBelongsToStrophe(zeileId, stropheId);

  if (data.text !== undefined && (!data.text || !data.text.trim())) {
    throw new Error("Text ist erforderlich");
  }

  // Taktbereich-Validierung
  if (data.startTakt !== undefined) {
    if (data.startTakt !== null && (!Number.isInteger(data.startTakt) || data.startTakt < 1)) {
      throw new Error("startTakt muss eine positive Ganzzahl sein");
    }
  }
  if (data.endTakt !== undefined) {
    if (data.endTakt !== null && (!Number.isInteger(data.endTakt) || data.endTakt < 1)) {
      throw new Error("endTakt muss eine positive Ganzzahl sein");
    }
  }

  // Konsistenzprüfung
  const effektivStartTakt = data.startTakt !== undefined ? data.startTakt : bestehendeZeile.startTakt;
  const effektivEndTakt = data.endTakt !== undefined ? data.endTakt : bestehendeZeile.endTakt;

  if (effektivEndTakt !== null && effektivStartTakt === null) {
    throw new Error("endTakt kann nicht ohne startTakt gesetzt werden");
  }
  if (effektivStartTakt !== null && effektivEndTakt !== null && effektivStartTakt > effektivEndTakt) {
    throw new Error("startTakt muss kleiner oder gleich endTakt sein");
  }

  const updateData: Record<string, unknown> = {};
  if (data.text !== undefined) updateData.text = data.text.trim();
  if (data.uebersetzung !== undefined) updateData.uebersetzung = data.uebersetzung;
  if (data.istKommentar !== undefined) updateData.istKommentar = data.istKommentar;
  if (data.startTakt !== undefined) updateData.startTakt = data.startTakt;
  if (data.endTakt !== undefined) updateData.endTakt = data.endTakt;

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
