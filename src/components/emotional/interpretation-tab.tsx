"use client";

import { useState } from "react";
import type { StropheDetail } from "@/types/song";
import type { InterpretationResponse } from "@/types/interpretation";
import { StropheCard } from "./strophe-card";
import TranslationToggle from "@/components/songs/translation-toggle";

interface InterpretationTabProps {
  strophen: StropheDetail[];
  interpretations: InterpretationResponse[];
  revealedLines: Record<string, Set<string>>;
  onRevealLine: (stropheId: string, zeileId: string) => void;
  onRevealAll: (stropheId: string) => void;
  onInterpretationSave: (stropheId: string, text: string) => void;
}

export function InterpretationTab({
  strophen,
  interpretations,
  revealedLines,
  onRevealLine,
  onRevealAll,
  onInterpretationSave,
}: InterpretationTabProps) {
  const [showTranslations, setShowTranslations] = useState(false);

  // Local state for textarea values keyed by stropheId
  const [localTexts, setLocalTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const interp of interpretations) {
      initial[interp.stropheId] = interp.text;
    }
    // Fall back to LLM-generated analyse if no manual interpretation exists
    for (const strophe of strophen) {
      if (!initial[strophe.id] && strophe.analyse) {
        initial[strophe.id] = strophe.analyse;
      }
    }
    return initial;
  });

  function handleBlur(stropheId: string) {
    const text = localTexts[stropheId]?.trim();
    if (text) {
      onInterpretationSave(stropheId, text);
    }
  }

  function handleChange(stropheId: string, value: string) {
    setLocalTexts((prev) => ({ ...prev, [stropheId]: value }));
  }

  return (
    <div className="space-y-4">
      {/* Translation toggle */}
      <div className="flex justify-end">
        <TranslationToggle
          checked={showTranslations}
          onChange={setShowTranslations}
        />
      </div>

      {strophen.map((strophe) => {
        const currentText = localTexts[strophe.id] ?? "";
        return (
          <StropheCard
            key={strophe.id}
            strophe={strophe}
            revealedLines={revealedLines[strophe.id] ?? new Set()}
            onRevealLine={(zeileId) => onRevealLine(strophe.id, zeileId)}
            onRevealAll={() => onRevealAll(strophe.id)}
            twoColumnTranslation={showTranslations}
            hideRevealLines={!showTranslations}
          >
            <div
              className="mt-4 rounded-lg p-4"
              style={{ backgroundColor: "#EEEDFE" }}
            >
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Bedeutung dieser Strophe
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                rows={3}
                value={currentText}
                onChange={(e) => handleChange(strophe.id, e.target.value)}
                onBlur={() => handleBlur(strophe.id)}
                aria-label={`Interpretation für ${strophe.name}`}
              />
            </div>
          </StropheCard>
        );
      })}
    </div>
  );
}
