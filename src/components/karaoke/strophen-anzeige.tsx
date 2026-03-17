"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { StropheDetail } from "@/types/song";

interface StrophenAnzeigeProps {
  strophe: StropheDetail;
  activeZeileId: string;
}

export function StrophenAnzeige({ strophe, activeZeileId }: StrophenAnzeigeProps) {
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

  useEffect(() => {
    const container = containerRef.current;
    const activeEl = lineRefs.current.get(activeZeileId);
    if (!container || !activeEl) return;

    const containerHeight = container.clientHeight;
    const centerY = containerHeight / 2;
    const activeTop = activeEl.offsetTop;
    const activeHeight = activeEl.offsetHeight;
    const activeCenter = activeTop + activeHeight / 2;

    setOffsetY(centerY - activeCenter);
  }, [activeZeileId, strophe.id]);

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
          const isActive = zeile.id === activeZeileId;
          return (
            <p
              key={zeile.id}
              ref={(el) => setLineRef(zeile.id, el)}
              className={`text-center text-white transition-all duration-300 ${
                isActive
                  ? "text-2xl font-bold opacity-100"
                  : "text-xl opacity-40"
              }`}
            >
              {zeile.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
