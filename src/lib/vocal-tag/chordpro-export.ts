import type { ChordProNode } from "@/types/vocal-tag";
import { serializeChordPro } from "./chordpro-serializer";

/**
 * Serialisiert ChordPro-Nodes und löst einen Browser-Download als `.chopro`-Datei aus.
 *
 * @param nodes - Array von ChordProNode-Objekten (Editor-Inhalt)
 * @param filename - Dateiname ohne Erweiterung (Standard: "songtext")
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */
export function exportChordPro(
  nodes: ChordProNode[],
  filename: string = "songtext",
): void {
  const rawText = serializeChordPro(nodes);
  downloadAsChopro(rawText, filename);
}

/**
 * Löst einen Browser-Download einer `.chopro`-Datei mit dem gegebenen Textinhalt aus.
 *
 * @param content - ChordPro-Rohtext
 * @param filename - Dateiname ohne Erweiterung
 */
export function downloadAsChopro(
  content: string,
  filename: string = "songtext",
): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.chopro`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
