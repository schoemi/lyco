import { prisma } from "@/lib/prisma";
import type {
  CreateStropheInput,
  UpdateStropheInput,
  ReorderItem,
  StropheDetail,
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

function mapStrophe(s: {
  id: string;
  name: string;
  orderIndex: number;
  analyse?: string | null;
  zeilen: Parameters<typeof mapZeile>[0][];
  markups: { id: string; typ: string; ziel: string; wert: string | null; timecodeMs: number | null; wortIndex: number | null }[];
  fortschritte?: { prozent: number }[];
  notizen?: { text: string }[];
}): StropheDetail {
  const zeilen: ZeileDetail[] = s.zeilen.map(mapZeile);
  const stropheMarkups: MarkupResponse[] = s.markups.map((m) => ({
    id: m.id,
    typ: m.typ as MarkupResponse["typ"],
    ziel: m.ziel as MarkupResponse["ziel"],
    wert: m.wert,
    timecodeMs: m.timecodeMs,
    wortIndex: m.wortIndex,
  }));

  const fort = s.fortschritte?.[0];
  const notiz = s.notizen?.[0];

  return {
    id: s.id,
    name: s.name,
    orderIndex: s.orderIndex,
    progress: fort ? fort.prozent : 0,
    notiz: notiz ? notiz.text : null,
    analyse: s.analyse ?? null,
    zeilen,
    markups: stropheMarkups,
  };
}

const stropheInclude = (userId: string) => ({
  zeilen: {
    orderBy: { orderIndex: "asc" as const },
    include: { markups: true },
  },
  markups: true,
  fortschritte: { where: { userId } },
  notizen: { where: { userId } },
});

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

export async function createStrophe(
  userId: string,
  songId: string,
  data: CreateStropheInput
): Promise<StropheDetail> {
  await verifySongOwnership(userId, songId);

  if (!data.name || !data.name.trim()) {
    throw new Error("Name ist erforderlich");
  }

  // Auto-assign next orderIndex
  const maxOrder = await prisma.strophe.aggregate({
    where: { songId },
    _max: { orderIndex: true },
  });
  const nextOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  const created = await prisma.strophe.create({
    data: {
      name: data.name.trim(),
      orderIndex: nextOrderIndex,
      songId,
    },
    include: stropheInclude(userId),
  });

  return mapStrophe(created);
}

export async function updateStrophe(
  userId: string,
  songId: string,
  stropheId: string,
  data: UpdateStropheInput
): Promise<StropheDetail> {
  await verifySongOwnership(userId, songId);
  await verifyStropheBelongsToSong(stropheId, songId);

  if (data.name !== undefined && (!data.name || !data.name.trim())) {
    throw new Error("Name ist erforderlich");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();

  const updated = await prisma.strophe.update({
    where: { id: stropheId },
    data: updateData,
    include: stropheInclude(userId),
  });

  return mapStrophe(updated);
}

export async function deleteStrophe(
  userId: string,
  songId: string,
  stropheId: string
): Promise<void> {
  await verifySongOwnership(userId, songId);
  await verifyStropheBelongsToSong(stropheId, songId);

  // Prisma cascade delete handles zeilen and markups via schema relations
  await prisma.strophe.delete({ where: { id: stropheId } });
}

export async function reorderStrophen(
  userId: string,
  songId: string,
  order: ReorderItem[]
): Promise<void> {
  await verifySongOwnership(userId, songId);

  if (!Array.isArray(order) || order.length === 0) {
    throw new Error("Reihenfolge ist erforderlich");
  }

  // Validate all strophen belong to this song
  const strophen = await prisma.strophe.findMany({
    where: { songId },
    select: { id: true },
  });
  const stropheIds = new Set(strophen.map((s) => s.id));

  for (const item of order) {
    if (!item.id || typeof item.orderIndex !== "number") {
      throw new Error("Ungültiges Reihenfolge-Element");
    }
    if (!stropheIds.has(item.id)) {
      throw new Error("Strophe nicht gefunden");
    }
  }

  // Batch update in a transaction
  await prisma.$transaction(
    order.map((item) =>
      prisma.strophe.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      })
    )
  );
}
