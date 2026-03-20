"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CoachBereich from "@/components/songs/coach-bereich";
import type { SongDetail } from "@/types/song";
import { AppIcon } from "@/components/ui/iconify-icon";

export default function CoachPage() {
  const params = useParams();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchSong() {
      try {
        const res = await fetch(`/api/songs/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Song nicht gefunden");
          if (res.status === 403) throw new Error("Zugriff verweigert");
          throw new Error("Fehler beim Laden des Songs");
        }
        const json = await res.json();
        setSong(json.song);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSong();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-neutral-500">Song wird geladen…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-lg border border-error-200 bg-error-50 px-6 py-4 text-sm text-error-700">
          {error}
        </div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="space-y-6">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 shadow-sm -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
        <Link
          href={`/songs/${id}`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-newsong-600 hover:text-newsong-800"
          aria-label="Zurück zur Song-Detailseite"
        >
          ← Zurück
        </Link>
        <h1 className="text-base font-semibold text-neutral-900 truncate px-2">
          {song.titel}
        </h1>
        <span className="text-sm font-medium text-success-700 whitespace-nowrap">
          <AppIcon icon="lucide:mic-vocal" className="inline mr-1.5 text-base align-[-2px]" /> Gesangstechnik-Coach
        </span>
      </nav>

      {/* Coach content */}
      <CoachBereich
        songId={id}
        coachTipp={song.coachTipp}
        onCoachTippChanged={(tipp) =>
          setSong((prev) => (prev ? { ...prev, coachTipp: tipp } : prev))
        }
      />
    </div>
  );
}
