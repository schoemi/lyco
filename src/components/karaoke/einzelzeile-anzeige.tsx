"use client";

import type { FlatLine } from "@/types/karaoke";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { VocalTagZeile } from "@/components/karaoke/vocal-tag-zeile";

interface EinzelzeileAnzeigeProps {
  activeLine: FlatLine;
  showVocalTags?: boolean;
  tagDefinitions?: TagDefinitionData[];
}

export function EinzelzeileAnzeige({
  activeLine,
  showVocalTags = false,
  tagDefinitions = [],
}: EinzelzeileAnzeigeProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-3xl font-semibold text-white text-center px-4">
        {showVocalTags && tagDefinitions.length > 0 ? (
          <VocalTagZeile rawText={activeLine.rawText} tagDefinitions={tagDefinitions} />
        ) : (
          activeLine.text
        )}
      </p>
    </div>
  );
}
