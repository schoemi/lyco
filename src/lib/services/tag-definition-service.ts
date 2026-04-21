import { prisma } from "@/lib/prisma";
import type {
  TagDefinitionData,
  CreateTagDefinitionInput,
  UpdateTagDefinitionInput,
} from "@/types/vocal-tag";

export async function getAllTagDefinitions(): Promise<TagDefinitionData[]> {
  const definitions = await prisma.tagDefinition.findMany({
    orderBy: { indexNr: "asc" },
    include: { category: true },
  });

  return definitions.map((d) => ({
    id: d.id,
    tag: d.tag,
    label: d.label,
    icon: d.icon,
    color: d.color,
    indexNr: d.indexNr,
    categoryId: d.categoryId,
    ...(d.category
      ? {
          category: {
            id: d.category.id,
            title: d.category.title,
            slug: d.category.slug,
            orderIndex: d.category.orderIndex,
          },
        }
      : {}),
  }));
}

export async function createTagDefinition(
  input: CreateTagDefinitionInput
): Promise<TagDefinitionData> {
  const existing = await prisma.tagDefinition.findUnique({
    where: { tag: input.tag },
  });

  if (existing) {
    throw new Error("Ein Tag mit diesem Kürzel existiert bereits");
  }

  let created;
  try {
    created = await prisma.tagDefinition.create({
      data: {
        tag: input.tag,
        label: input.label,
        icon: input.icon,
        color: input.color,
        indexNr: input.indexNr,
        ...(input.categoryId !== undefined
          ? { categoryId: input.categoryId ?? null }
          : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    // Re-throw non-Error objects (e.g. from PrismaPg adapter) as standard Errors
    const message =
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : String(err);
    throw new Error(message);
  }

  return {
    id: created.id,
    tag: created.tag,
    label: created.label,
    icon: created.icon,
    color: created.color,
    indexNr: created.indexNr,
    categoryId: created.categoryId,
  };
}

export async function updateTagDefinition(
  id: string,
  input: UpdateTagDefinitionInput
): Promise<TagDefinitionData> {
  const existing = await prisma.tagDefinition.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Tag-Definition nicht gefunden");
  }

  const updateData: Record<string, unknown> = {};
  if (input.label !== undefined) updateData.label = input.label;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.indexNr !== undefined) updateData.indexNr = input.indexNr;
  if (input.categoryId !== undefined) updateData.categoryId = input.categoryId ?? null;

  const updated = await prisma.tagDefinition.update({
    where: { id },
    data: updateData,
  });

  return {
    id: updated.id,
    tag: updated.tag,
    label: updated.label,
    icon: updated.icon,
    color: updated.color,
    indexNr: updated.indexNr,
    categoryId: updated.categoryId,
  };
}

export async function deleteTagDefinition(
  id: string
): Promise<{ deleted: boolean; affectedSongs: number }> {
  const existing = await prisma.tagDefinition.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Tag-Definition nicht gefunden");
  }

  const affectedSongs = await countSongsUsingTag(existing.tag);

  await prisma.tagDefinition.delete({ where: { id } });

  return { deleted: true, affectedSongs };
}

export async function countSongsUsingTag(tag: string): Promise<number> {
  // Search for `{tag:` pattern in Zeile texts, then count distinct songs
  const pattern = `{${tag}:`;

  const zeilen = await prisma.zeile.findMany({
    where: {
      text: { contains: pattern },
    },
    select: {
      strophe: {
        select: { songId: true },
      },
    },
  });

  const uniqueSongIds = new Set(zeilen.map((z) => z.strophe.songId));
  return uniqueSongIds.size;
}
