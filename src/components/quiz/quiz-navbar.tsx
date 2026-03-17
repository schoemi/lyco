"use client";

import Link from "next/link";

interface QuizNavbarProps {
  songId: string;
  songTitle: string;
}

export function QuizNavbar({ songId, songTitle }: QuizNavbarProps) {
  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      <Link
        href={`/songs/${songId}`}
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        aria-label="Zurück zur Song-Detailseite"
      >
        ← Zurück
      </Link>
      <h1 className="text-base font-semibold text-gray-900 truncate px-2">
        {songTitle}
      </h1>
      <span className="text-sm font-medium text-purple-700 whitespace-nowrap">
        Quiz
      </span>
    </nav>
  );
}
