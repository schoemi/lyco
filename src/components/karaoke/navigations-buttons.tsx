"use client";

interface NavigationsButtonsProps {
  onNext: () => void;
  onPrev: () => void;
  isFirstLine: boolean;
  isLastLine: boolean;
}

export function NavigationsButtons({
  onNext,
  onPrev,
  isFirstLine,
  isLastLine,
}: NavigationsButtonsProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onPrev}
        disabled={isFirstLine}
        aria-label="Vorherige Zeile"
        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 ${
          isFirstLine
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-white/10 active:bg-white/20"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        onClick={onNext}
        disabled={isLastLine}
        aria-label="Nächste Zeile"
        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 ${
          isLastLine
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-white/10 active:bg-white/20"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
