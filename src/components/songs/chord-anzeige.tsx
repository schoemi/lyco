"use client";

import { useMemo } from "react";
import { parseChords } from "@/lib/chords/chord-parser";
import { ZeileMarkupView } from "@/components/songs/zeile-markup-view";
import type { TagDefinitionData } from "@/types/vocal-tag";

export interface ChordAnzeigeProps {
  /** Zeilentext mit [Akkord]-Notation */
  text: string;
  /** Tag-Definitionen für Vocal-Tag-Rendering (optional) */
  tagDefinitions?: TagDefinitionData[];
}

/**
 * ChordAnzeige – Zeigt Akkorde über dem zugehörigen Text an.
 *
 * Parst den Zeilentext mit `parseChords()` und rendert eine Akkordzeile
 * über der Textzeile. Akkorde werden per CSS `ch`-Einheit an der korrekten
 * Zeichenposition ausgerichtet. Wenn keine Akkorde vorhanden sind, wird
 * nur der reine Text ohne zusätzliche Akkordzeile gerendert.
 *
 * Font-Familie und -Größe werden vom Parent-Container geerbt, damit
 * die aufrufende Komponente einheitlich steuern kann (z.B. Monospace
 * für alle Zeilen wenn Akkorde aktiv).
 *
 * Koexistenz mit Vocal-Tags: Wenn `tagDefinitions` übergeben werden,
 * wird der plainText mit ZeileMarkupView gerendert, sodass Vocal-Tag-Badges
 * inline im Text erscheinen.
 */
export function ChordAnzeige({ text, tagDefinitions }: ChordAnzeigeProps) {
  const { plainText, chords } = useMemo(() => parseChords(text), [text]);

  const hasTagDefs = tagDefinitions && tagDefinitions.length > 0;

  const textContent = hasTagDefs ? (
    <ZeileMarkupView text={plainText} tagDefinitions={tagDefinitions} />
  ) : (
    <span className="text-neutral-900">{plainText}</span>
  );

  if (chords.length === 0) {
    return (
      <div className="leading-relaxed whitespace-pre-wrap">
        {textContent}
      </div>
    );
  }

  return (
    <div className="leading-relaxed">
      {/* Akkordzeile */}
      <div
        className="relative whitespace-pre text-newsong-700 font-semibold select-none"
        style={{ height: "1.4em", fontSize: "0.75em" }}
        aria-hidden="true"
      >
        {chords.map((chord, i) => (
          <span
            key={`${chord.position}-${i}`}
            className="absolute"
            style={{ left: `${chord.position}ch` }}
          >
            {chord.name || "·"}
          </span>
        ))}
      </div>
      {/* Textzeile */}
      <div className="whitespace-pre-wrap text-neutral-900">
        {textContent}
      </div>
    </div>
  );
}
