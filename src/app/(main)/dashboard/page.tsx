"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SetCard } from "@/components/songs/set-card";
import { SongRow } from "@/components/songs/song-row";
import { ProgressBar } from "@/components/songs/progress-bar";
import SongCreateDialog from "@/components/songs/song-create-dialog";
import type { DashboardData, SongWithProgress } from "../../../types/song";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  function handleSongCreated(song: SongWithProgress) {
    setCreateDialogOpen(false);
    if (data) {
      setData({
        ...data,
        allSongs: [...data.allSongs, song],
        totalSongs: data.totalSongs + 1,
      });
    }
  }

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
        <div className="text-sm text-gray-500">Dashboard wird geladen…</div>
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

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Songs</p>
          <p className="text-2xl font-semibold text-gray-900">
            {data.totalSongs}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Sessions</p>
          <p className="text-2xl font-semibold text-gray-900">
            {data.totalSessions}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Fortschritt</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-semibold text-gray-900">
              {Math.round(data.averageProgress)}%
            </p>
            <ProgressBar value={data.averageProgress} className="flex-1" />
          </div>
        </div>
      </div>

      {/* Alle Songs */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Alle Songs</h2>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Neuer Song
          </button>
        </div>
        {data.allSongs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">Noch keine Songs vorhanden.</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <Link
                href="/songs/import"
                className="inline-block text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Song importieren →
              </Link>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="inline-block rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Neuer Song
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {data.allSongs.map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </div>
        )}
      </section>

      {/* Sets */}
      {data.sets.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Sets</h2>
          <div className="space-y-3">
            {data.sets.map((set) => (
              <SetCard key={set.id} set={set} />
            ))}
          </div>
        </section>
      )}
      {/* Song-Erstellen-Dialog */}
      <SongCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleSongCreated}
      />
    </div>
  );
}
