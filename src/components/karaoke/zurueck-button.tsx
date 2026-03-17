"use client";

interface ZurueckButtonProps {
  onBack: () => void;
}

export function ZurueckButton({ onBack }: ZurueckButtonProps) {
  return (
    <button
      onClick={onBack}
      aria-label="Zurück zur Song-Detailseite"
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 active:bg-white/20"
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
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
