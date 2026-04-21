import type {
  TagDefinitionData,
  TagKategorieData,
  GruppierteTagDefinitionen,
} from '@/types/vocal-tag';

/**
 * Filtert gruppierte Tag-Definitionen nach einem Suchbegriff.
 * Durchsucht die Felder `tag` und `label` (case-insensitive).
 * Gruppen, die nach der Filterung keine Tags mehr enthalten, werden entfernt.
 */
export function filtereGruppierteTagDefinitionen(
  gruppen: GruppierteTagDefinitionen[],
  suchbegriff: string,
): GruppierteTagDefinitionen[] {
  const suchbegriffLower = suchbegriff.toLowerCase();

  return gruppen
    .map((gruppe) => ({
      kategorie: gruppe.kategorie,
      tags: gruppe.tags.filter(
        (tag) =>
          tag.tag.toLowerCase().includes(suchbegriffLower) ||
          tag.label.toLowerCase().includes(suchbegriffLower),
      ),
    }))
    .filter((gruppe) => gruppe.tags.length > 0);
}

/**
 * Gruppiert Tag-Definitionen nach Kategorien.
 * Kategorien werden nach orderIndex sortiert.
 * Tags ohne Kategorie erscheinen in einer Gruppe am Ende.
 */
export function gruppiereTagsNachKategorie(
  tags: TagDefinitionData[],
  kategorien: TagKategorieData[],
): GruppierteTagDefinitionen[] {
  // Kategorien nach orderIndex sortieren (stabile Kopie)
  const sortierteKategorien = [...kategorien].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  // Tags nach categoryId gruppieren
  const tagsByCategory = new Map<string | null, TagDefinitionData[]>();

  for (const tag of tags) {
    const key = tag.categoryId ?? null;
    const gruppe = tagsByCategory.get(key);
    if (gruppe) {
      gruppe.push(tag);
    } else {
      tagsByCategory.set(key, [tag]);
    }
  }

  const ergebnis: GruppierteTagDefinitionen[] = [];

  // IDs der bekannten Kategorien sammeln
  const bekannteKategorieIds = new Set(sortierteKategorien.map((k) => k.id));

  // Gruppen für sortierte Kategorien erstellen (nur wenn Tags vorhanden)
  for (const kategorie of sortierteKategorien) {
    const gruppenTags = tagsByCategory.get(kategorie.id);
    if (gruppenTags && gruppenTags.length > 0) {
      ergebnis.push({ kategorie, tags: gruppenTags });
    }
  }

  // Tags ohne Kategorie oder mit unbekannter categoryId am Ende zusammenfassen
  const ohneKategorie: TagDefinitionData[] = [];
  for (const [key, gruppenTags] of tagsByCategory) {
    if (key === null || !bekannteKategorieIds.has(key)) {
      ohneKategorie.push(...gruppenTags);
    }
  }
  if (ohneKategorie.length > 0) {
    ergebnis.push({ kategorie: null, tags: ohneKategorie });
  }

  return ergebnis;
}
