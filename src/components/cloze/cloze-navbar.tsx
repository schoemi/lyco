"use client";

import Link from "next/link";

interface ClozeNavbarProps {
  songId: string;
  songTitle: string;
}

export function ClozeNavbar({ songId, songTitle }: ClozeNavbarProps) {
  return (
    <nav className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <Link
        href={`/songs/${songId}`}
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-newsong-600 hover:text-newsong-800"
        aria-label="Zurück zur Song-Detailseite"
      >
        ← Zurück
      </Link>
      <h1 className="text-base font-semibold text-neutral-900 truncate px-2">
        {songTitle}
      </h1>
      <span className="text-sm font-medium text-primary-700 whitespace-nowrap">
        Lückentext
      </span>
    </nav>
  );
}
