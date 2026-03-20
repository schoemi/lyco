"use client";

import { AppIcon } from "@/components/ui/iconify-icon";

interface TranslateButtonProps {
  translating: boolean;
  onClick: () => void;
}

export default function TranslateButton({ translating, onClick }: TranslateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={translating}
      aria-label="Songtext übersetzen"
      aria-busy={translating}
      className="min-h-[44px] min-w-[44px] rounded-md border border-newsong-300 px-3 py-1.5 text-sm font-medium text-newsong-700 hover:bg-newsong-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {translating ? "Übersetze…" : <><AppIcon icon="lucide:globe" className="inline mr-1.5 text-base align-[-2px]" /> Übersetzen</>}
    </button>
  );
}
