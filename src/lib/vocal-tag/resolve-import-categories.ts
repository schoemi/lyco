import {
  findTagKategorieBySlug,
  createTagKategorie,
} from "@/lib/services/tag-kategorie-service";
import type { TagConfigImportItem } from "@/lib/vocal-tag/tag-config-export";

/**
 * Ergebnis der Kategorie-Auflösung für importierte Tags.
 * Bildet den Tag-Identifier auf die aufgelöste categoryId ab (oder null).
 */
export type CategoryResolutionMap = Map<string, string | null>;

/**
 * Löst Kategorie-Slugs aus importierten Tag-Definitionen auf.
 *
 * Diese Funktion ist server-only, da sie Prisma-basierte Services verwendet.
 *
 * - Wenn `category` einem existierenden Slug entspricht → categoryId der bestehenden Kategorie
 * - Wenn `category` einem nicht-existierenden Slug entspricht → neue Kategorie wird erstellt (Slug als Titel)
 * - Wenn kein `category`-Feld → categoryId bleibt null
 *
 * Slug-Lookups werden gecacht, um redundante DB-Aufrufe für denselben Slug zu vermeiden.
 */
export async function resolveImportCategories(
  items: TagConfigImportItem[],
): Promise<CategoryResolutionMap> {
  const result: CategoryResolutionMap = new Map();
  const slugCache = new Map<string, string>();

  for (const item of items) {
    if (!item.category) {
      result.set(item.tag, null);
      continue;
    }

    const slug = item.category;

    // Check cache first
    if (slugCache.has(slug)) {
      result.set(item.tag, slugCache.get(slug)!);
      continue;
    }

    // Look up existing category by slug
    const existing = await findTagKategorieBySlug(slug);
    if (existing) {
      slugCache.set(slug, existing.id);
      result.set(item.tag, existing.id);
      continue;
    }

    // Create new category with slug as title
    const created = await createTagKategorie({ title: slug, slug });
    slugCache.set(slug, created.id);
    result.set(item.tag, created.id);
  }

  return result;
}
