"use client";

import type { FlatLine, DisplayMode } from "@/types/karaoke";
import type { SongDetail } from "@/types/song";
import { EinzelzeileAnzeige } from "@/components/karaoke/einzelzeile-anzeige";
import { StrophenAnzeige } from "@/components/karaoke/strophen-anzeige";
import { SongAnzeige } from "@/components/karaoke/song-anzeige";

interface TextAnzeigeProps {
  flatLines: FlatLine[];
  activeLineIndex: number;
  displayMode: DisplayMode;
  song: SongDetail;
}

export function TextAnzeige({
  flatLines,
  activeLineIndex,
  displayMode,
  song,
}: TextAnzeigeProps) {
  const activeLine = flatLines[activeLineIndex];

  if (!activeLine) {
    return null;
  }

  switch (displayMode) {
    case "einzelzeile":
      return <EinzelzeileAnzeige activeLine={activeLine} />;

    case "strophe": {
      const activeStrophe = song.strophen.find(
        (s) => s.id === activeLine.stropheId
      );
      if (!activeStrophe) return null;
      return (
        <StrophenAnzeige
          strophe={activeStrophe}
          activeZeileId={activeLine.zeileId}
        />
      );
    }

    case "song":
      return (
        <SongAnzeige
          song={song}
          activeLineIndex={activeLineIndex}
          flatLines={flatLines}
        />
      );
  }
}
