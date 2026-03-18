"use client";

import type { StropheDetail } from "@/types/song";
import { StropheCard } from "./strophe-card";
import TranslateButton from "@/components/songs/translate-button";
import LanguageSelector from "@/components/songs/language-selector";

interface TranslationTabProps {
  strophen: StropheDetail[];
  revealedLines: Record<string, Set<string>>;
  onRevealLine: (stropheId: string, zeileId: string) => void;
  onRevealAll: (stropheId: string) => void;
  onHideAll: (stropheId: string) => void;
  translating?: boolean;
  translateError?: string | null;
  translateSuccess?: boolean;
  zielsprache?: string;
  setZielsprache?: (sprache: string) => void;
  onTranslate?: () => void;
}

export function TranslationTab({
  strophen,
  revealedLines,
  onRevealLine,
  onRevealAll,
  onHideAll,
  translating = false,
  translateError = null,
  translateSuccess = false,
  zielsprache = "Deutsch",
  setZielsprache,
  onTranslate,
}: TranslationTabProps) {
  const hasTranslations = strophen.some((s) =>
    s.zeilen.some((z) => z.uebersetzung)
  );

  if (!hasTranslations) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">
          Noch keine Übersetzungen vorhanden. Starte eine Übersetzung, um die Zeilen zu übersetzen.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          {onTranslate && (
            <TranslateButton translating={translating} onClick={onTranslate} />
          )}
          {setZielsprache && (
            <LanguageSelector
              value={zielsprache}
              onChange={setZielsprache}
              disabled={translating}
            />
          )}
        </div>

        {translateError && (
          <div
            role="alert"
            className="rounded-md border border-error-300 bg-error-50 p-3 text-sm text-error-700"
          >
            {translateError}
          </div>
        )}

        {translateSuccess && (
          <div className="rounded-md border border-success-300 bg-success-50 p-3 text-sm text-success-700">
            Übersetzung erfolgreich abgeschlossen.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {strophen.map((strophe) => (
        <StropheCard
          key={strophe.id}
          strophe={strophe}
          revealedLines={revealedLines[strophe.id] ?? new Set()}
          onRevealLine={(zeileId) => onRevealLine(strophe.id, zeileId)}
          onRevealAll={() => onRevealAll(strophe.id)}
          onHideAll={() => onHideAll(strophe.id)}
        />
      ))}
    </div>
  );
}
