"use client";

interface CheckAllButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function CheckAllButton({ disabled, onClick }: CheckAllButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Alle prüfen
    </button>
  );
}
