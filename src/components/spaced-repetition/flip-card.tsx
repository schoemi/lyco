"use client";

interface FlipCardProps {
  stropheName: string;
  zeilen: { text: string; orderIndex: number }[];
  aufgedeckt: boolean;
  onFlip: () => void;
}

export function FlipCard({ stropheName, zeilen, aufgedeckt, onFlip }: FlipCardProps) {
  const sortierteZeilen = [...zeilen].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div
      className="perspective-[800px] w-full cursor-pointer select-none"
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={
        aufgedeckt
          ? `Strophe ${stropheName} aufgedeckt`
          : `Strophe ${stropheName} — tippe zum Aufdecken`
      }
    >
      <div
        className={`relative w-full transition-transform duration-[400ms] [transform-style:preserve-3d] ${
          aufgedeckt ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Vorderseite */}
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm [backface-visibility:hidden]">
          <p className="text-xl font-semibold text-gray-900">{stropheName}</p>
          <p className="mt-2 text-sm text-gray-400">Tippe zum Aufdecken</p>
        </div>

        {/* Rückseite */}
        <div
          className="absolute inset-0 flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-6 py-8 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-live="polite"
        >
          {aufgedeckt && (
            <div className="space-y-1 text-center">
              <p className="mb-3 text-sm font-medium text-gray-500">{stropheName}</p>
              {sortierteZeilen.map((zeile, idx) => (
                <p key={idx} className="text-base text-gray-800">
                  {zeile.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
