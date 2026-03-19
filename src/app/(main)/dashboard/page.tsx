"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SetCard } from "@/components/songs/set-card";
import { SongCardGrid } from "@/components/songs/song-card-grid";
import { MetrikKarte } from "@/components/gamification/metrik-karte";
import { StreakPill } from "@/components/gamification/streak-pill";
import { SpacedRepetitionWidget } from "@/components/spaced-repetition/spaced-repetition-widget";
import SetEditDialog from "@/components/songs/set-edit-dialog";
import GeteilteInhalteSektion from "@/components/sharing/geteilte-inhalte-sektion";
import type { DashboardData } from "../../../types/song";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createSetDialogOpen, setCreateSetDialogOpen] = useState(false);
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);

  // Songs that are not in any set
  const unassignedSongs = useMemo(() => {
    if (!data) return [];
    const assignedIds = new Set(data.sets.flatMap((s) => s.songs.map((song) => song.id)));
    return data.allSongs.filter((song) => !assignedIds.has(song.id));
  }, [data]);

  async function fetchDashboard() {
    try {
      setLoading(true);
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

  useEffect(() => {
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

      {/* Sets — always visible */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Sets</h2>
          <button
            type="button"
            onClick={() => setCreateSetDialogOpen(true)}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Neues Set
          </button>
        </div>
        {data.sets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center">
            <p className="text-sm text-neutral-400">Noch keine Sets vorhanden.</p>
            <div className="mt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setCreateSetDialogOpen(true)}
                className="inline-block rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                + Neues Set
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.sets.map((set) => (
              <SetCard key={set.id} set={set} />
            ))}
          </div>
        )}
      </section>

      {/* Songs ohne Set-Zuordnung */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setUnassignedExpanded((prev) => !prev)}
            aria-expanded={unassignedExpanded}
            aria-controls="unassigned-songs"
            className="flex items-center gap-2 py-1 text-left"
          >
            <h2 className="text-sm font-semibold text-neutral-700">
              Ohne Set
              <span className="ml-2 text-xs font-normal text-neutral-400">
                {unassignedSongs.length} {unassignedSongs.length === 1 ? "Song" : "Songs"}
              </span>
            </h2>
            <svg
              className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${unassignedExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Link
            href="/songs/import"
            className="rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700"
          >
            + Neuer Song
          </Link>
        </div>
        {unassignedExpanded && (
          <div id="unassigned-songs">
            {unassignedSongs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center">
                <p className="text-sm text-neutral-400">Alle Songs sind in Sets zugeordnet.</p>
              </div>
            ) : (
              <SongCardGrid songs={unassignedSongs} />
            )}
          </div>
        )}
      </section>

      {/* Geteilte Inhalte */}
      {data.geteilteInhalte && (
        <GeteilteInhalteSektion geteilteInhalte={data.geteilteInhalte} />
      )}

      {/* Set Create Dialog */}
      <SetEditDialog
        open={createSetDialogOpen}
        onClose={() => setCreateSetDialogOpen(false)}
        onSaved={() => {
          setCreateSetDialogOpen(false);
          fetchDashboard();
        }}
      />
    </div>
  );
}
