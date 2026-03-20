"use client";

import type { FlatLine, DisplayMode } from "@/types/karaoke";
import type { SongDetail } from "@/types/song";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { EinzelzeileAnzeige } from "@/components/karaoke/einzelzeile-anzeige";
import { StrophenAnzeige } from "@/components/karaoke/strophen-anzeige";
import { SongAnzeige } from "@/components/karaoke/song-anzeige";

interface TextAnzeigeProps {
  flatLines: FlatLine[];
  activeLineIndex: number;
  displayMode: DisplayMode;
  song: SongDetail;
  /** When true, renders vocal tags inline (compact icons) */
  showVocalTags?: boolean;
  /** Tag definitions needed for vocal tag rendering */
  tagDefinitions?: TagDefinitionData[];
}

export function TextAnzeige({
  flatLines,
  activeLineIndex,
  displayMode,
  song,
  showVocalTags = false,
  tagDefinitions = [],
}: TextAnzeigeProps) {
  const activeLine = flatLines[activeLineIndex];

  if (!activeLine) {
    return null;
  }

  switch (displayMode) {
    case "einzelzeile":
      return (
        <EinzelzeileAnzeige
          activeLine={activeLine}
          showVocalTags={showVocalTags}
          tagDefinitions={tagDefinitions}
        />
      );

    case "strophe": {
      const activeStrophe = song.strophen.find(
        (s) => s.id === activeLine.stropheId
      );
      if (!activeStrophe) return null;
      return (
        <StrophenAnzeige
          strophe={activeStrophe}
          activeZeileId={activeLine.zeileId}
          showVocalTags={showVocalTags}
          tagDefinitions={tagDefinitions}
        />
      );
    }

    case "song":
      return (
        <SongAnzeige
          song={song}
          activeLineIndex={activeLineIndex}
          flatLines={flatLines}
          showVocalTags={showVocalTags}
          tagDefinitions={tagDefinitions}
        />
      );

    case "keinText":
      return null;
  }
}
