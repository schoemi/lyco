"use client";

import type { StropheDetail } from "@/types/song";
import { StropheCard } from "./strophe-card";

interface TranslationTabProps {
  strophen: StropheDetail[];
  revealedLines: Record<string, Set<string>>;
  onRevealLine: (stropheId: string, zeileId: string) => void;
  onRevealAll: (stropheId: string) => void;
}

export function TranslationTab({
  strophen,
  revealedLines,
  onRevealLine,
  onRevealAll,
}: TranslationTabProps) {
  return (
    <div className="space-y-4">
      {strophen.map((strophe) => (
        <StropheCard
          key={strophe.id}
          strophe={strophe}
          revealedLines={revealedLines[strophe.id] ?? new Set()}
          onRevealLine={(zeileId) => onRevealLine(strophe.id, zeileId)}
          onRevealAll={() => onRevealAll(strophe.id)}
        />
      ))}
    </div>
  );
}
