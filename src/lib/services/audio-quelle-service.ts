import { prisma } from "@/lib/prisma";
import type { AudioQuelle } from "@/generated/prisma/client";
import type {
  CreateAudioQuelleInput,
  UpdateAudioQuelleInput,
} from "@/types/audio";

function validateUrl(url: string): void {
  if (!url || !url.trim()) {
    throw new Error("Ungültige URL");
  }
  const trimmed = url.trim();
  // Allow internal upload paths
  if (trimmed.startsWith("/api/uploads/")) {
    return;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Ungültige URL");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "Ungültige URL") {
      throw e;
    }
    throw new Error("Ungültige URL");
  }
}

async function verifySongOwnership(
  songId: string,
  userId: string
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

export async function getAudioQuellen(
  songId: string,
  userId: string
): Promise<AudioQuelle[]> {
  await verifySongOwnership(songId, userId);
  return prisma.audioQuelle.findMany({
    where: { songId },
    orderBy: { orderIndex: "asc" },
  });
}

export async function createAudioQuelle(
  songId: string,
  input: CreateAudioQuelleInput,
  userId: string
): Promise<AudioQuelle> {
  await verifySongOwnership(songId, userId);
  validateUrl(input.url);

  if (!input.label || !input.label.trim()) {
    throw new Error("Label ist erforderlich");
  }

  const maxOrder = await prisma.audioQuelle.aggregate({
    where: { songId },
    _max: { orderIndex: true },
  });
  const nextIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  return prisma.audioQuelle.create({
    data: {
      songId,
      url: input.url.trim(),
      typ: input.typ,
      label: input.label.trim(),
      orderIndex: nextIndex,
    },
  });
}

export async function updateAudioQuelle(
  quelleId: string,
  input: UpdateAudioQuelleInput,
  userId: string
): Promise<AudioQuelle> {
  const quelle = await prisma.audioQuelle.findUnique({
    where: { id: quelleId },
  });
  if (!quelle) {
    throw new Error("Audio-Quelle nicht gefunden");
  }

  await verifySongOwnership(quelle.songId, userId);

  if (input.url !== undefined) {
    validateUrl(input.url);
  }
  if (input.label !== undefined && (!input.label || !input.label.trim())) {
    throw new Error("Label ist erforderlich");
  }

  const updateData: Record<string, unknown> = {};
  if (input.url !== undefined) updateData.url = input.url.trim();
  if (input.typ !== undefined) updateData.typ = input.typ;
  if (input.label !== undefined) updateData.label = input.label.trim();

  return prisma.audioQuelle.update({
    where: { id: quelleId },
    data: updateData,
  });
}

export async function deleteAudioQuelle(
  quelleId: string,
  userId: string
): Promise<void> {
  const quelle = await prisma.audioQuelle.findUnique({
    where: { id: quelleId },
  });
  if (!quelle) {
    throw new Error("Audio-Quelle nicht gefunden");
  }

  await verifySongOwnership(quelle.songId, userId);

  await prisma.$transaction(async (tx) => {
    await tx.audioQuelle.delete({ where: { id: quelleId } });

    const remaining = await tx.audioQuelle.findMany({
      where: { songId: quelle.songId },
      orderBy: { orderIndex: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].orderIndex !== i) {
        await tx.audioQuelle.update({
          where: { id: remaining[i].id },
          data: { orderIndex: i },
        });
      }
    }
  });
}
