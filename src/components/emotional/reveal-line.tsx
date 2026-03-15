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
      <p className="text-gray-900" style={{ fontSize: "15px" }}>
        {zeile.text}
      </p>

      {/* Translation line – only rendered when translation exists */}
      {hasTranslation && (
        <button
          type="button"
          onClick={onReveal}
          disabled={isRevealed}
          className="block w-full min-h-[44px] rounded px-2 py-1 text-left transition-all duration-200 ease-in-out"
          style={{
            fontSize: "13px",
            fontStyle: "italic",
            color: isRevealed ? "#6b7280" : "transparent",
            backgroundColor: isRevealed ? "transparent" : "#d1d5db",
          }}
          aria-label={
            isRevealed
              ? undefined
              : `Übersetzung aufdecken: ${zeile.text}`
          }
        >
          <span aria-hidden={!isRevealed}>
            {zeile.uebersetzung}
          </span>
        </button>
      )}
    </div>
  );
}
