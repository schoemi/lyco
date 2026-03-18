import type { StropheDetail } from "@/types/song";

/**
 * Aggregiert den gesamten Songtext aus Strophen und Zeilen zu einem
 * zusammenhängenden String mit Strophen-Überschriften.
 *
 * Format:
 * [Strophe 1 Name]
 * Zeile 1
 * Zeile 2
 *
 * [Strophe 2 Name]
 * Zeile 1
 * ...
 */
export function aggregateSongText(strophen: StropheDetail[]): string {
  const sorted = [...strophen].sort((a, b) => a.orderIndex - b.orderIndex);

  return sorted
    .map((strophe) => {
      const sortedZeilen = [...strophe.zeilen].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );
      const header = `[${strophe.name}]`;
      const lines = sortedZeilen.map((z) => z.text).join("\n");
      return lines ? `${header}\n${lines}` : header;
    })
    .join("\n\n");
}

/**
 * Prüft ob der Songtext ChordPro-Tags enthält.
 */
export function hasChordProTags(strophen: StropheDetail[]): boolean {
  return strophen.some((s) =>
    s.zeilen.some((z) => /\{[a-zA-Z][a-zA-Z0-9]*:[^}]*\}/.test(z.text)),
  );
}
