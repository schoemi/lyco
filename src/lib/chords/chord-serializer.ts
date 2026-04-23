import { ChordPosition } from "@/types/chord";

/**
 * Serialisiert Akkorde zurück in [Akkord]-Notation im Text.
 *
 * Fügt Akkorde an den korrekten Positionen im reinen Text ein.
 *
 * Beispiele:
 * - `serializeChords("Hallo Welt", [{ name: "Am", position: 0 }, { name: "G", position: 6 }])` → `"[Am]Hallo [G]Welt"`
 * - `serializeChords("Kein Akkord", [])` → `"Kein Akkord"`
 *
 * Fehlerbehandlung:
 * - Akkord-Position außerhalb des Textbereichs → Akkord wird am Textende angehängt
 * - Leerer Akkordname → wird als `[]` serialisiert (Platzhalter)
 */
export function serializeChords(
  plainText: string,
  chords: ChordPosition[],
): string {
  if (chords.length === 0) {
    return plainText;
  }

  // Sort chords by position (ascending), keeping original order for same positions
  const sorted = [...chords].sort((a, b) => a.position - b.position);

  // Clamp positions to valid range [0, plainText.length]
  const clamped = sorted.map((chord) => ({
    name: chord.name,
    position: Math.max(0, Math.min(chord.position, plainText.length)),
  }));

  let result = "";
  let textIndex = 0;

  for (const chord of clamped) {
    // Append plain text up to this chord's position
    if (chord.position > textIndex) {
      result += plainText.slice(textIndex, chord.position);
      textIndex = chord.position;
    }
    // Insert the chord notation
    result += `[${chord.name}]`;
  }

  // Append any remaining plain text
  if (textIndex < plainText.length) {
    result += plainText.slice(textIndex);
  }

  return result;
}
