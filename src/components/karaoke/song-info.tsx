"use client";

interface SongInfoProps {
  titel: string;
  kuenstler: string | null;
  compact?: boolean;
}

export function SongInfo({ titel, kuenstler, compact }: SongInfoProps) {
  return (
    <div className="text-center text-white">
      <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>{titel}</p>
      {kuenstler && (
        <p className={compact ? "text-xs text-white/60" : "text-sm text-white/70"}>{kuenstler}</p>
      )}
    </div>
  );
}
