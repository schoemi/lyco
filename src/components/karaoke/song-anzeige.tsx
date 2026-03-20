"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SongDetail } from "@/types/song";
import type { FlatLine } from "@/types/karaoke";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { getLineOpacity } from "@/lib/karaoke/line-opacity";
import { shouldFade } from "@/lib/karaoke/fade-visibility";
import { stripChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { VocalTagZeile } from "@/components/karaoke/vocal-tag-zeile";

interface SongAnzeigeProps {
  song: SongDetail;
  activeLineIndex: number;
  flatLines: FlatLine[];
  showVocalTags?: boolean;
  tagDefinitions?: TagDefinitionData[];
}

export function SongAnzeige({
  song,
  activeLineIndex,
  flatLines,
  showVocalTags = false,
  tagDefinitions = [],
}: SongAnzeigeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const [offsetY, setOffsetY] = useState(0);
  const activeLine = flatLines[activeLineIndex];

  const setLineRef = useCallback(
    (index: number, el: HTMLParagraphElement | null) => {
      if (el) {
        lineRefs.current.set(index, el);
      } else {
        lineRefs.current.delete(index);
      }
    },
    []
  );

  // Calculate translateY so the active line sits at the vertical center
  useEffect(() => {
    const container = containerRef.current;
    const activEl = lineRefs.current.get(activeLineIndex);
    if (!container || !activEl) return;

    const containerHeight = container.clientHeight;
    const centerY = containerHeight / 2;

    // activEl.offsetTop is relative to the inner wrapper, not the container
    const activeTop = activEl.offsetTop;
    const activeHeight = activEl.offsetHeight;
    const activeCenter = activeTop + activeHeight / 2;

    setOffsetY(centerY - activeCenter);
  }, [activeLineIndex, flatLines]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden px-4"
    >
      <div
        className="flex flex-col items-center transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {song.strophen
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((strophe, stropheIdx) => {
            const sortedZeilen = [...strophe.zeilen].sort(
              (a, b) => a.orderIndex - b.orderIndex
            );

            return (
              <div key={strophe.id} className={stropheIdx > 0 ? "mt-6" : ""}>
                {sortedZeilen.map((zeile) => {
                  const flatLine = flatLines.find(
                    (fl) => fl.zeileId === zeile.id
                  );
                  if (!flatLine) return null;

                  const isActive = flatLine.globalIndex === activeLineIndex;
                  const opacity = getLineOpacity(flatLine, activeLine, "song");
                  const fadeTop = shouldFade(
                    flatLine.globalIndex,
                    activeLineIndex,
                    flatLines.length,
                    "top"
                  );
                  const fadeBottom = shouldFade(
                    flatLine.globalIndex,
                    activeLineIndex,
                    flatLines.length,
                    "bottom"
                  );
                  const hasFade = fadeTop || fadeBottom;

                  return (
                    <p
                      key={zeile.id}
                      ref={(el) => setLineRef(flatLine.globalIndex, el)}
                      className={`text-center text-white transition-all duration-300 ${
                        isActive ? "text-2xl font-bold" : "text-xl"
                      }`}
                      style={{
                        opacity: hasFade ? Math.min(opacity, 0.15) : opacity,
                      }}
                    >
                      {showVocalTags && tagDefinitions.length > 0 ? (
                        <VocalTagZeile rawText={zeile.text} tagDefinitions={tagDefinitions} />
                      ) : (
                        stripChordPro(zeile.text)
                      )}
                    </p>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}
