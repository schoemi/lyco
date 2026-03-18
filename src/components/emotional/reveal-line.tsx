"use client";

import type { ZeileDetail } from "@/types/song";

interface RevealLineProps {
  zeile: ZeileDetail;
  isRevealed: boolean;
  onReveal: () => void;
}

export function RevealLine({ zeile, isRevealed, onReveal }: RevealLineProps) {
  const hasTranslation = zeile.uebersetzung !== null && zeile.uebersetzung !== "";

  return (
    <div className="space-y-1">
      {/* Original line */}
      <p className="text-neutral-900" style={{ fontSize: "15px" }}>
        {zeile.text}
      </p>

      {/* Translation line – only rendered when translation exists and is revealed */}
      {hasTranslation && isRevealed && (
        <p
          className="px-2 py-1 text-neutral-500 italic"
          style={{ fontSize: "13px" }}
        >
          {zeile.uebersetzung}
        </p>
      )}
    </div>
  );
}
