import type { SongDetail } from "@/types/song";
import type { FlatLine } from "@/types/karaoke";
import { stripChordPro } from "@/lib/vocal-tag/chordpro-parser";
import {
  filterLernbareStrophen,
  filterLernbareZeilen,
} from "@/lib/shared/strophen-selection";

/**
 * Flattens a SongDetail's strophen and zeilen into a single ordered list of FlatLine objects.
 * Strophen are sorted by orderIndex, then zeilen within each strophe by orderIndex.
 * Vocal tags (ChordPro markup) are stripped from the display text; rawText preserves the original.
 *
 * Instrumental strophes (istInstrumental === true) are excluded entirely.
 * Kommentar zeilen (istKommentar === true) within remaining strophes are excluded.
 */
export function flattenLines(song: SongDetail): FlatLine[] {
  const learnableStrophen = filterLernbareStrophen(song.strophen);
  const sortedStrophen = [...learnableStrophen].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const flatLines: FlatLine[] = [];
  let globalIndex = 0;

  for (const strophe of sortedStrophen) {
    const learnableZeilen = filterLernbareZeilen(strophe.zeilen);
    const sortedZeilen = [...learnableZeilen].sort(
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
