import type { SongDetail } from "@/types/song";
import type { FlatLine } from "@/types/karaoke";
import { stripChordPro } from "@/lib/vocal-tag/chordpro-parser";

/**
 * Flattens a SongDetail's strophen and zeilen into a single ordered list of FlatLine objects.
 * Strophen are sorted by orderIndex, then zeilen within each strophe by orderIndex.
 * Vocal tags (ChordPro markup) are stripped from the display text; rawText preserves the original.
 */
export function flattenLines(song: SongDetail): FlatLine[] {
  const sortedStrophen = [...song.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const flatLines: FlatLine[] = [];
  let globalIndex = 0;

  for (const strophe of sortedStrophen) {
    const sortedZeilen = [...strophe.zeilen].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    const stropheLineCount = sortedZeilen.length;

    for (let i = 0; i < sortedZeilen.length; i++) {
      const zeile = sortedZeilen[i];
      flatLines.push({
        zeileId: zeile.id,
        text: stripChordPro(zeile.text),
        rawText: zeile.text,
        stropheId: strophe.id,
        stropheName: strophe.name,
        globalIndex,
        indexInStrophe: i,
        stropheLineCount,
      });
      globalIndex++;
    }
  }

  return flatLines;
}
