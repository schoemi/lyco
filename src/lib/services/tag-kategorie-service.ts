import { prisma } from "@/lib/prisma";
import type {
  TagKategorieData,
  CreateTagKategorieInput,
  UpdateTagKategorieInput,
} from "@/types/vocal-tag";

export async function getAllTagKategorien(): Promise<TagKategorieData[]> {
  const kategorien = await prisma.tagKategorie.findMany({
    orderBy: { orderIndex: "asc" },
    include: {
      _count: {
        select: { tagDefinitions: true },
      },
    },
  });

  return kategorien.map((k) => ({
    id: k.id,
    title: k.title,
    slug: k.slug,
    orderIndex: k.orderIndex,
    _count: k._count,
  }));
}

export async function createTagKategorie(
  input: CreateTagKategorieInput
): Promise<TagKategorieData> {
  const existing = await prisma.tagKategorie.findUnique({
    where: { slug: input.slug },
  });

  if (existing) {
    throw new Error("Eine Kategorie mit diesem Slug existiert bereits");
  }

  let created;
  try {
    created = await prisma.tagKategorie.create({
      data: {
        title: input.title,
        slug: input.slug,
        orderIndex: input.orderIndex ?? 0,
      },
      include: {
        _count: {
          select: { tagDefinitions: true },
        },
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
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
    title: created.title,
    slug: created.slug,
    orderIndex: created.orderIndex,
    _count: created._count,
  };
}

export async function updateTagKategorie(
  id: string,
  input: UpdateTagKategorieInput
): Promise<TagKategorieData> {
  const existing = await prisma.tagKategorie.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Tag-Kategorie nicht gefunden");
  }

  if (input.slug !== undefined && input.slug !== existing.slug) {
    const slugConflict = await prisma.tagKategorie.findUnique({
      where: { slug: input.slug },
    });
    if (slugConflict) {
      throw new Error("Eine Kategorie mit diesem Slug existiert bereits");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.orderIndex !== undefined) updateData.orderIndex = input.orderIndex;

  const updated = await prisma.tagKategorie.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { tagDefinitions: true },
      },
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    orderIndex: updated.orderIndex,
    _count: updated._count,
  };
}

export async function deleteTagKategorie(
  id: string
): Promise<{ deleted: boolean; affectedTags: number }> {
  const existing = await prisma.tagKategorie.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tagDefinitions: true },
      },
    },
  });

  if (!existing) {
    throw new Error("Tag-Kategorie nicht gefunden");
  }

  const affectedTags = existing._count.tagDefinitions;

  // Prisma onDelete: SetNull automatically sets categoryId to null on related TagDefinitions
  await prisma.tagKategorie.delete({ where: { id } });

  return { deleted: true, affectedTags };
}

export async function findTagKategorieBySlug(
  slug: string
): Promise<TagKategorieData | null> {
  const kategorie = await prisma.tagKategorie.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { tagDefinitions: true },
      },
    },
  });

  if (!kategorie) {
    return null;
  }

  return {
    id: kategorie.id,
    title: kategorie.title,
    slug: kategorie.slug,
    orderIndex: kategorie.orderIndex,
    _count: kategorie._count,
  };
}
