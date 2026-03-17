"use client";

import type { FlatLine } from "@/types/karaoke";

interface EinzelzeileAnzeigeProps {
  activeLine: FlatLine;
}

export function EinzelzeileAnzeige({ activeLine }: EinzelzeileAnzeigeProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-3xl font-semibold text-white text-center px-4">
        {activeLine.text}
      </p>
    </div>
  );
}
