"use client";

import { useState } from "react";
import type { StropheDetail } from "@/types/song";
import { StropheCard } from "./strophe-card";

interface NotesTabProps {
  strophen: StropheDetail[];
  revealedLines: Record<string, Set<string>>;
  onRevealLine: (stropheId: string, zeileId: string) => void;
  onRevealAll: (stropheId: string) => void;
  onNoteSave: (stropheId: string, text: string) => void;
}

export function NotesTab({
  strophen,
  revealedLines,
  onRevealLine,
  onRevealAll,
  onNoteSave,
}: NotesTabProps) {
  // Local state for note textarea values keyed by stropheId
  const [localTexts, setLocalTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const strophe of strophen) {
      if (strophe.notiz) {
        initial[strophe.id] = strophe.notiz;
      }
    }
    return initial;
  });

  function handleBlur(stropheId: string) {
    const text = localTexts[stropheId]?.trim();
    if (text) {
      onNoteSave(stropheId, text);
    }
  }

  function handleChange(stropheId: string, value: string) {
    setLocalTexts((prev) => ({ ...prev, [stropheId]: value }));
  }

  return (
    <div className="space-y-4">
      {strophen.map((strophe) => {
        const currentText = localTexts[strophe.id] ?? "";
        return (
          <StropheCard
            key={strophe.id}
            strophe={strophe}
            revealedLines={revealedLines[strophe.id] ?? new Set()}
            onRevealLine={(zeileId) => onRevealLine(strophe.id, zeileId)}
            onRevealAll={() => onRevealAll(strophe.id)}
            hideRevealLines
          >
            <div className="mt-4">
              <textarea
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                rows={3}
                value={currentText}
                onChange={(e) => handleChange(strophe.id, e.target.value)}
                onBlur={() => handleBlur(strophe.id)}
                placeholder="Meine persönliche Verbindung zu diesem Abschnitt..."
                aria-label={`Notiz für ${strophe.name}`}
              />
            </div>
          </StropheCard>
        );
      })}
    </div>
  );
}
