"use client";

import type { StropheDetail } from "@/types/song";
import { RevealLine } from "./reveal-line";

interface StropheCardProps {
  strophe: StropheDetail;
  revealedLines: Set<string>;
  onRevealLine: (zeileId: string) => void;
  onRevealAll: () => void;
  children?: React.ReactNode;
}

export function StropheCard({
  strophe,
  revealedLines,
  onRevealLine,
  onRevealAll,
  children,
}: StropheCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{strophe.name}</h3>
        <button
          type="button"
          onClick={onRevealAll}
          className="min-h-[44px] min-w-[44px] rounded-md px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors"
          aria-label={`Alle Übersetzungen in ${strophe.name} aufdecken`}
        >
          Alle aufdecken
        </button>
      </div>

      {/* Lines */}
      <div className="space-y-3">
        {strophe.zeilen.map((zeile) => (
          <RevealLine
            key={zeile.id}
            zeile={zeile}
            isRevealed={revealedLines.has(zeile.id)}
            onReveal={() => onRevealLine(zeile.id)}
          />
        ))}
      </div>

      {/* Extra content (interpretation box, notes field, etc.) */}
      {children}
    </div>
  );
}
