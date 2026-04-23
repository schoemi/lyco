import { ChordParseResult, ChordPosition } from "@/types/chord";

/**
 * Parst Zeilentext mit [Akkord]-Notation.
 *
 * Extrahiert alle Akkorde in eckigen Klammern und gibt den reinen Text
 * sowie ein Array von Akkord-Positionen zurück.
 *
 * Beispiele:
 * - `"[Am]Hallo [G]Welt"` → `{ plainText: "Hallo Welt", chords: [{ name: "Am", position: 0 }, { name: "G", position: 6 }] }`
 * - `"Kein Akkord"` → `{ plainText: "Kein Akkord", chords: [] }`
 * - `"[]Platzhalter"` → `{ plainText: "Platzhalter", chords: [{ name: "", position: 0 }] }`
 */
export function parseChords(text: string): ChordParseResult {
  const chords: ChordPosition[] = [];
  let plainText = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "[") {
      const closingBracket = text.indexOf("]", i + 1);
      if (closingBracket === -1) {
        // No closing bracket found — treat rest as plain text
        plainText += text.slice(i);
        break;
      }
      const chordName = text.slice(i + 1, closingBracket);
      chords.push({ name: chordName, position: plainText.length });
      i = closingBracket + 1;
    } else {
      plainText += text[i];
      i++;
    }
  }

  return { plainText, chords };
}
