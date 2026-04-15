"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { StropheDetail } from "@/types/song";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { stripChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { VocalTagZeile } from "@/components/karaoke/vocal-tag-zeile";

interface StrophenAnzeigeProps {
  strophe: StropheDetail;
  activeZeileId: string;
  showVocalTags?: boolean;
  tagDefinitions?: TagDefinitionData[];
  getLineColor?: (stropheId: string) => string;
}

export function StrophenAnzeige({
  strophe,
  activeZeileId,
  showVocalTags = false,
  tagDefinitions = [],
  getLineColor,
}: StrophenAnzeigeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<string, HTMLParagraphElement>>(new Map());
  const [offsetY, setOffsetY] = useState(0);

  const sortedZeilen = [...strophe.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const setLineRef = useCallback(
    (id: string, el: HTMLParagraphElement | null) => {
      if (el) {
        lineRefs.current.set(id, el);
      } else {
        lineRefs.current.delete(id);
      }
    },
    []
  );

  // Find the effective active zeile id — skip kommentar zeilen
  const effectiveActiveZeileId = (() => {
    const zeile = sortedZeilen.find((z) => z.id === activeZeileId);
    if (zeile && !zeile.istKommentar) return activeZeileId;
    // If the active zeile is a kommentar, don't scroll to it
    return null;
  })();

  useEffect(() => {
    const container = containerRef.current;
    if (!effectiveActiveZeileId) return;
    const activeEl = lineRefs.current.get(effectiveActiveZeileId);
    if (!container || !activeEl) return;

    const containerHeight = container.clientHeight;
    const centerY = containerHeight / 2;
    const activeTop = activeEl.offsetTop;
    const activeHeight = activeEl.offsetHeight;
    const activeCenter = activeTop + activeHeight / 2;

    setOffsetY(centerY - activeCenter);
  }, [effectiveActiveZeileId, strophe.id]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden px-4"
    >
      <div
        className="flex flex-col items-center gap-2 transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {sortedZeilen.map((zeile) => {
          const isKommentar = zeile.istKommentar;
          // Kommentar zeilen are never treated as active
          const isActive = !isKommentar && zeile.id === effectiveActiveZeileId;
          return (
            <p
              key={zeile.id}
              ref={(el) => setLineRef(zeile.id, el)}
              className={`text-center transition-all duration-300 ${
                getLineColor ? "" : "text-white"
              } ${
                isKommentar
                  ? "text-xl italic opacity-30"
                  : isActive
                    ? "text-2xl font-bold opacity-100"
                    : "text-xl opacity-40"
              }`}
              style={getLineColor ? { color: getLineColor(strophe.id) } : undefined}
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
    </div>
  );
}
