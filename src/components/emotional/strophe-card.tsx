"use client";

import type { StropheDetail } from "@/types/song";
import { RevealLine } from "./reveal-line";

interface StropheCardProps {
  strophe: StropheDetail;
  revealedLines: Set<string>;
  onRevealLine: (zeileId: string) => void;
  onRevealAll: () => void;
  onHideAll?: () => void;
  /** When true, show two-column layout (original | translation) instead of reveal buttons */
  twoColumnTranslation?: boolean;
  /** When true, show only original text without reveal buttons or translations */
  hideRevealLines?: boolean;
  children?: React.ReactNode;
}

export function StropheCard({
  strophe,
  revealedLines,
  onRevealLine,
  onRevealAll,
  onHideAll,
  twoColumnTranslation = false,
  hideRevealLines = false,
  children,
}: StropheCardProps) {
  const allRevealed = strophe.zeilen.length > 0 &&
    strophe.zeilen.every((z) => revealedLines.has(z.id));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{strophe.name}</h3>
        {!twoColumnTranslation && !hideRevealLines && (
          <button
            type="button"
            role="switch"
            aria-checked={allRevealed}
            onClick={allRevealed && onHideAll ? onHideAll : onRevealAll}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              allRevealed
                ? "border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
                : "border-gray-300 text-gray-500 bg-white hover:bg-gray-50"
            }`}
            aria-label={
              allRevealed
                ? `Alle Übersetzungen in ${strophe.name} ausblenden`
                : `Alle Übersetzungen in ${strophe.name} aufdecken`
            }
          >
            <span
              aria-hidden="true"
              className={`relative inline-block h-4 w-7 shrink-0 rounded-full transition-colors ${
                allRevealed ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  allRevealed ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </span>
            Übersetzung
          </button>
        )}
      </div>

      {/* Lines */}
      {twoColumnTranslation ? (
        <div className="space-y-2">
          {strophe.zeilen.map((zeile) => (
            <div key={zeile.id} className="grid grid-cols-2 gap-4">
              <p className="text-gray-900" style={{ fontSize: "15px" }}>
                {zeile.text}
              </p>
              <p
                className="text-gray-500 italic"
                style={{ fontSize: "13px" }}
              >
                {zeile.uebersetzung ?? ""}
              </p>
            </div>
          ))}
        </div>
      ) : hideRevealLines ? (
        <div className="space-y-2">
          {strophe.zeilen.map((zeile) => (
            <p key={zeile.id} className="text-gray-900" style={{ fontSize: "15px" }}>
              {zeile.text}
            </p>
          ))}
        </div>
      ) : (
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
      )}

      {/* Extra content (interpretation box, notes field, etc.) */}
      {children}
    </div>
  );
}
