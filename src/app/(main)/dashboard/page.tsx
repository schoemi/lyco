"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SetCard } from "@/components/songs/set-card";
import { SongRow } from "@/components/songs/song-row";
import { MetrikKarte } from "@/components/gamification/metrik-karte";
import { StreakPill } from "@/components/gamification/streak-pill";
import { SpacedRepetitionWidget } from "@/components/spaced-repetition/spaced-repetition-widget";
import type { DashboardData } from "../../../types/song";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          throw new Error("Fehler beim Laden der Dashboard-Daten");
        }
        const json: DashboardData = await res.json();
        setData(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-neutral-500">Dashboard wird geladen…</div>
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

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-neutral-900">Dashboard</h1>

      {/* Spaced Repetition Widget */}
      <SpacedRepetitionWidget faelligeAnzahl={data.faelligeStrophenAnzahl} />

      {/* Streak */}
      {data.streak > 0 && (
        <div className="flex items-center">
          <StreakPill streak={data.streak} />
        </div>
      )}

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetrikKarte label="Songs aktiv" value={data.activeSongCount} />
        <MetrikKarte label="Sessions gesamt" value={data.totalSessions} />
        <MetrikKarte label="Ø Fortschritt" value={`${Math.round(data.averageProgress)}%`} fortschrittsbalken={data.averageProgress} />
      </div>

      {/* Alle Songs */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Alle Songs</h2>
          <Link
            href="/songs/import"
            className="rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700"
          >
            + Neuer Song
          </Link>
        </div>
        {data.allSongs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center">
            <p className="text-sm text-neutral-400">Noch keine Songs vorhanden.</p>
            <div className="mt-2 flex items-center justify-center">
              <Link
                href="/songs/import"
                className="inline-block rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700"
              >
                + Neuer Song
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
            {data.allSongs.map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </div>
        )}
      </section>

      {/* Sets */}
      {data.sets.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-700">Sets</h2>
          <div className="space-y-3">
            {data.sets.map((set) => (
              <SetCard key={set.id} set={set} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
