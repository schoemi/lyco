import type { SongDetail } from "@/types/song";
import type { FlatLine } from "@/types/karaoke";

/**
 * Flattens a SongDetail's strophen and zeilen into a single ordered list of FlatLine objects.
 * Strophen are sorted by orderIndex, then zeilen within each strophe by orderIndex.
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
        text: zeile.text,
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
