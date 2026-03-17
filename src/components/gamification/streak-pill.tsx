"use client";

export interface StreakPillProps {
  streak: number;
}

export function StreakPill({ streak }: StreakPillProps) {
  if (streak === 0) return null;

  const text = streak === 1 ? "1 Tag Streak" : `${streak} Tage Streak`;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700"
      aria-label={text}
      role="status"
    >
      <span aria-hidden="true">🔥</span>
      {text}
    </span>
  );
}
