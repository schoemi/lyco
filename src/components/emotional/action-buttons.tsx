"use client";

import { useRouter } from "next/navigation";

interface ActionButtonsProps {
  songId: string;
  onDeepen: () => void;
}

export function ActionButtons({ songId, onDeepen }: ActionButtonsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <button
        type="button"
        onClick={onDeepen}
        className="min-h-[44px] min-w-[44px] rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        Symbolik vertiefen
      </button>
      <button
        type="button"
        onClick={() => router.push(`/songs/${songId}/cloze`)}
        className="min-h-[44px] min-w-[44px] rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        Zum Lückentext
      </button>
    </div>
  );
}
