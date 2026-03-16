export type Schwierigkeitsstufe = "sehr-leicht" | "leichter" | "mittel" | "schwer";

export const SCHWIERIGKEITS_STUFEN: readonly Schwierigkeitsstufe[] = [
  "sehr-leicht",
  "leichter",
  "mittel",
  "schwer",
] as const;

export const SCHWIERIGKEITS_LABELS: Record<Schwierigkeitsstufe, string> = {
  "sehr-leicht": "Sehr Leicht",
  "leichter": "Leichter",
  "mittel": "Mittel",
  "schwer": "Schwer",
};

export const DEFAULT_SCHWIERIGKEITSSTUFE: Schwierigkeitsstufe = "schwer";

/**
 * Berechnet den Hinweistext für eine Zeile basierend auf der Schwierigkeitsstufe.
 * Gibt einen leeren String zurück, wenn kein Hinweis angezeigt werden soll.
 */
export function berechneHinweis(zeile: string, stufe: Schwierigkeitsstufe): string {
  const trimmed = zeile.trim();
  if (trimmed === "") return "";
  if (stufe === "schwer") return "";

  const woerter = trimmed.split(/\s+/);

  switch (stufe) {
    case "sehr-leicht": {
      if (woerter.length === 1) return woerter[0];
      return `${woerter[0]} \u2026 ${woerter[woerter.length - 1]}`;
    }
    case "leichter":
      return woerter[0];
    case "mittel":
      return `${trimmed[0]}\u2026`;
  }
}
