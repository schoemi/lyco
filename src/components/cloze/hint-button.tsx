"use client";

interface HintButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function HintButton({ disabled, onClick }: HintButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="Hinweis anzeigen"
      className={[
        "inline-flex items-center justify-center",
        "min-w-[44px] min-h-[44px] p-1",
        "text-sm text-purple-600",
        "rounded hover:bg-purple-50",
        "disabled:opacity-40 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      💡
    </button>
  );
}
