"use client";

import type { StropheDetail } from "@/types/song";
import type { GapData } from "@/types/cloze";
import { GapInput } from "./gap-input";
import { HintButton } from "./hint-button";

interface StanzaBlockProps {
  strophe: StropheDetail;
  gaps: GapData[];
  answers: Record<string, string>;
  feedback: Record<string, "correct" | "incorrect" | null>;
  hints: Set<string>;
  onAnswer: (gapId: string, value: string) => void;
  onBlur: (gapId: string) => void;
  onHint: (gapId: string) => void;
}

export function StanzaBlock({
  strophe,
  gaps,
  answers,
  feedback,
  hints,
  onAnswer,
  onBlur,
  onHint,
}: StanzaBlockProps) {
  // Sort zeilen by orderIndex
  const sortedZeilen = [...strophe.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  // All gaps in this stanza (for aria-label numbering)
  const stanzaGaps = gaps.filter((g) => g.isGap);
  const totalGaps = stanzaGaps.length;

  // Build a map of gapId → position among stanza gaps (1-based)
  const gapPositionMap = new Map<string, number>();
  let gapCounter = 0;
  for (const zeile of sortedZeilen) {
    const zeileGaps = gaps
      .filter((g) => g.zeileId === zeile.id)
      .sort((a, b) => a.wordIndex - b.wordIndex);
    for (const g of zeileGaps) {
      if (g.isGap) {
        gapCounter++;
        gapPositionMap.set(g.gapId, gapCounter);
      }
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase text-neutral-500">
        {strophe.name}
      </div>

      <div className="space-y-1">
        {sortedZeilen.map((zeile) => {
          const wordsForZeile = gaps
            .filter((g) => g.zeileId === zeile.id)
            .sort((a, b) => a.wordIndex - b.wordIndex);

          return (
            <div key={zeile.id} className="leading-relaxed">
              {wordsForZeile.map((gapData) => {
                if (!gapData.isGap) {
                  return (
                    <span key={gapData.gapId} className="mr-1">
                      {gapData.prefix}{gapData.word}{gapData.suffix}
                    </span>
                  );
                }

                const position = gapPositionMap.get(gapData.gapId) ?? 1;
                const ariaLabel = `Lücke ${position} von ${totalGaps} in ${strophe.name}`;

                return (
                  <span key={gapData.gapId} className="inline-flex items-center mr-1">
                    {gapData.prefix && <span>{gapData.prefix}</span>}
                    <GapInput
                      gapId={gapData.gapId}
                      targetWord={gapData.word}
                      value={answers[gapData.gapId] ?? ""}
                      feedback={feedback[gapData.gapId] ?? null}
                      hintActive={hints.has(gapData.gapId)}
                      ariaLabel={ariaLabel}
                      onChange={(value) => onAnswer(gapData.gapId, value)}
                      onBlur={() => onBlur(gapData.gapId)}
                    />
                    {gapData.suffix && <span>{gapData.suffix}</span>}
                    <HintButton
                      disabled={
                        hints.has(gapData.gapId) ||
                        feedback[gapData.gapId] === "correct"
                      }
                      onClick={() => onHint(gapData.gapId)}
                    />
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
