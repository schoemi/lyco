"use client";

interface AudioStopButtonProps {
  onStop: () => void;
  disabled?: boolean;
}

/**
 * Stop button for karaoke mode.
 * Renders a square icon (■) and calls onStop when clicked.
 */
export function AudioStopButton({ onStop, disabled = false }: AudioStopButtonProps) {
  return (
    <button
      onClick={onStop}
      disabled={disabled}
      aria-label="Stopp"
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 active:bg-white/20 disabled:pointer-events-none disabled:opacity-40"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    </button>
  );
}
