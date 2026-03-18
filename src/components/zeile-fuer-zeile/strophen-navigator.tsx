"use client";

interface StrophenNavigatorProps {
  currentStropheName: string;
  currentPosition: number; // 1-basiert
  totalStrophen: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onPrevious: () => void;
  onNext: () => void;
  positionSuffix?: string;
  showDirectionIcon?: boolean;
}

export function StrophenNavigator({
  currentStropheName,
  currentPosition,
  totalStrophen,
  canGoBack,
  canGoForward,
  onPrevious,
  onNext,
  positionSuffix,
  showDirectionIcon,
}: StrophenNavigatorProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoBack}
        aria-label="Vorherige Strophe"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-lg font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ←
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold text-neutral-900">{currentStropheName}</p>
        <p className="text-xs text-neutral-500">
          {showDirectionIcon && <span className="mr-1">←</span>}
          Strophe {currentPosition} von {totalStrophen}
          {positionSuffix && <span> {positionSuffix}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoForward}
        aria-label="Nächste Strophe"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-lg font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        →
      </button>
    </div>
  );
}
