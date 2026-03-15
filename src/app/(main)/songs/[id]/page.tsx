"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProgressBar } from "@/components/songs/progress-bar";
import { StropheCard } from "@/components/songs/strophe-card";
import type { SongDetail } from "../../../../types/song";

export default function SongDetailPage() {
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
          if (res.status === 404) {
            throw new Error("Song nicht gefunden");
          }
          if (res.status === 403) {
            throw new Error("Zugriff verweigert");
          }
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
        <div className="text-sm text-gray-500">Song wird geladen…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!song) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        aria-label="Zurück zum Dashboard"
      >
        ← Dashboard
      </Link>

      {/* Song header */}
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {song.titel}
        </h1>

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          {song.kuenstler && <span>Künstler: {song.kuenstler}</span>}
          {song.sprache && <span>Sprache: {song.sprache}</span>}
        </div>

        {/* Emotion tags */}
        {song.emotionsTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {song.emotionsTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Overall progress & sessions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Gesamtfortschritt</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-semibold text-gray-900">
              {Math.round(song.progress)}%
            </p>
            <ProgressBar value={song.progress} className="flex-1" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Sessions</p>
          <p className="text-2xl font-semibold text-gray-900">
            {song.sessionCount}
          </p>
        </div>
      </div>

      {/* Learning modes */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Lernmethoden</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/songs/${id}/emotional`}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            🎭 Emotionales Lernen
          </Link>
          <Link
            href={`/songs/${id}/cloze`}
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            ✏️ Lückentext
          </Link>
        </div>
      </div>

      {/* Strophes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Strophen</h2>
        {song.strophen.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Keine Strophen vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {song.strophen.map((strophe) => (
              <StropheCard key={strophe.id} strophe={strophe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

