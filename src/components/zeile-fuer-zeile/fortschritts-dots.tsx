"use client";

interface FortschrittsDotsProps {
  totalZeilen: number;
  currentIndex: number;
  completedIndices: Set<number>;
}

export function FortschrittsDots({
  totalZeilen,
  currentIndex,
  completedIndices,
}: FortschrittsDotsProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={completedIndices.size}
      aria-valuemax={totalZeilen}
      aria-label="Lernfortschritt in der Strophe"
      className="flex items-center gap-2"
    >
      {Array.from({ length: totalZeilen }, (_, i) => {
        const isCompleted = completedIndices.has(i);
        const isCurrent = i === currentIndex;

        let dotClass = "h-3 w-3 rounded-full";
        if (isCompleted) {
          dotClass += " bg-green-500";
        } else if (isCurrent) {
          dotClass += " bg-purple-600";
        } else {
          dotClass += " border-2 border-gray-300";
        }

        return <span key={i} className={dotClass} />;
      })}
    </div>
  );
}
