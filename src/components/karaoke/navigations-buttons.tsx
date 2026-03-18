"use client";

interface NavigationsButtonsProps {
  onNext: () => void;
  onPrev: () => void;
  onNextStrophe: () => void;
  onPrevStrophe: () => void;
  isFirstLine: boolean;
  isLastLine: boolean;
  isFirstStrophe: boolean;
  isLastStrophe: boolean;
}

export function NavigationsButtons({
  onNext,
  onPrev,
  onNextStrophe,
  onPrevStrophe,
  isFirstLine,
  isLastLine,
  isFirstStrophe,
  isLastStrophe,
}: NavigationsButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      {/* Previous strophe – double chevron up */}
      <button
        onClick={onPrevStrophe}
        disabled={isFirstStrophe}
        aria-label="Vorherige Strophe"
        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 ${
          isFirstStrophe
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
          <polyline points="18 11 12 5 6 11" />
          <polyline points="18 18 12 12 6 18" />
        </svg>
      </button>

      {/* Previous line – single chevron up */}
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

      {/* Next line – single chevron down */}
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

      {/* Next strophe – double chevron down */}
      <button
        onClick={onNextStrophe}
        disabled={isLastStrophe}
        aria-label="Nächste Strophe"
        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 ${
          isLastStrophe
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
          <polyline points="6 6 12 12 18 6" />
          <polyline points="6 13 12 19 18 13" />
        </svg>
      </button>
    </div>
  );
}
