"use client";

import { AppIcon } from "@/components/ui/iconify-icon";

export interface StreakPillProps {
  streak: number;
}

export function StreakPill({ streak }: StreakPillProps) {
  if (streak === 0) return null;

  const text = streak === 1 ? "1 Tag Streak" : `${streak} Tage Streak`;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-3 py-1 text-sm font-medium text-warning-700"
      aria-label={text}
      role="status"
    >
      <span aria-hidden="true"><AppIcon icon="lucide:flame" className="text-base" /></span>
      {text}
    </span>
  );
}
