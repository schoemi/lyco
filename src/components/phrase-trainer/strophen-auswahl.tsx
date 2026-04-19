"use client";

import { useCallback } from "react";
import { hatTimecode } from "@/lib/phrase-trainer/utils";
import { filterLernbareStrophen } from "@/lib/shared/strophen-selection";
import type { StropheDetail } from "@/types/song";

interface StrophenAuswahlProps {
  strophen: StropheDetail[];
  ausgewaehlteIds: Set<string>;
  onAuswahlAendern: (ids: Set<string>) => void;
  onStarten: () => void;
}

export function StrophenAuswahl({
  strophen,
  ausgewaehlteIds,
  onAuswahlAendern,
  onStarten,
}: StrophenAuswahlProps) {
  // Filter out instrumental strophes — only learnable strophes shown
  const lernbareStrophen = filterLernbareStrophen(strophen);

  // Sort by orderIndex
  const sortierteStrophen = [...lernbareStrophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const handleToggle = useCallback(
    (stropheId: string) => {
      const next = new Set(ausgewaehlteIds);
      if (next.has(stropheId)) {
        next.delete(stropheId);
      } else {
        next.add(stropheId);
      }
      onAuswahlAendern(next);
    },
    [ausgewaehlteIds, onAuswahlAendern],
  );

  const handleAlleAuswaehlen = useCallback(() => {
    const auswaehlbar = sortierteStrophen.filter((s) => hatTimecode(s));
    onAuswahlAendern(new Set(auswaehlbar.map((s) => s.id)));
  }, [sortierteStrophen, onAuswahlAendern]);

  const handleAlleAbwaehlen = useCallback(() => {
    onAuswahlAendern(new Set());
  }, [onAuswahlAendern]);

  const hatAuswahl = ausgewaehlteIds.size > 0;
  const auswaehlbareAnzahl = sortierteStrophen.filter((s) =>
    hatTimecode(s),
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Strophen auswählen</h2>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAlleAuswaehlen}
          disabled={auswaehlbareAnzahl === 0}
          className="min-h-[44px] rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Alle auswählen
        </button>
        <button
          type="button"
          onClick={handleAlleAbwaehlen}
          disabled={!hatAuswahl}
          className="min-h-[44px] rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Alle abwählen
        </button>
      </div>

      {/* Strophen list */}
      <ul className="space-y-1" role="list">
        {sortierteStrophen.length === 0 && (
          <li className="py-4 text-center text-sm text-neutral-500">
            Keine Texte vorhanden
          </li>
        )}
        {sortierteStrophen.map((strophe) => {
          const istAuswaehlbar = hatTimecode(strophe);
          const istAusgewaehlt = ausgewaehlteIds.has(strophe.id);

          return (
            <li key={strophe.id}>
              <label
                className={`flex min-h-[44px] items-center gap-3 rounded px-2 py-1 ${
                  istAuswaehlbar
                    ? "cursor-pointer hover:bg-neutral-50"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={istAusgewaehlt}
                  disabled={!istAuswaehlbar}
                  onChange={() => handleToggle(strophe.id)}
                  className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={
                    istAuswaehlbar
                      ? strophe.name
                      : `${strophe.name} – Timecode erforderlich`
                  }
                />
                <span className="flex-1 text-sm">{strophe.name}</span>
                {!istAuswaehlbar && (
                  <span className="text-xs text-neutral-400">
                    Timecode erforderlich
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {/* Start button */}
      <button
        type="button"
        onClick={onStarten}
        disabled={!hatAuswahl}
        className="min-h-[44px] w-full rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Übung starten
      </button>
    </div>
  );
}
