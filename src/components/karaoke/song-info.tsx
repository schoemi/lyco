"use client";

interface SongInfoProps {
  titel: string;
  kuenstler: string | null;
}

export function SongInfo({ titel, kuenstler }: SongInfoProps) {
  return (
    <div className="text-center text-white">
      <p className="text-base font-semibold">{titel}</p>
      {kuenstler && (
        <p className="text-sm text-white/70">{kuenstler}</p>
      )}
    </div>
  );
}
