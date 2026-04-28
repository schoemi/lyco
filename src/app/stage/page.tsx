"use client";

/**
 * StageSetlistPage — Setlist-Ansicht des Stage-Modus
 *
 * Anforderungen: 5.1, 5.2, 5.3, 5.4, 5.5, 4.1–4.6, 12.1
 */

import { useState } from "react";
import Link from "next/link";
import { useStageData } from "@/lib/stage/use-stage-data";
import { usePreflightCheck } from "@/lib/stage/use-preflight-check";
import { PreflightCheck } from "@/components/stage/preflight-check";
import { StageEinstellungsDialog } from "@/components/stage/stage-einstellungs-dialog";
import { loadStageSettings, saveStageSettings } from "@/lib/stage/storage";
import type { StageSettings } from "@/types/stage";

// ─── Pure logic function (exported for testing) ───────────────────────────────

/**
 * Sorts songs by their orderIndex in ascending order.
 * Preserves the stored orderIndex ordering (Req 5.1).
 */
export function sortSongsByOrderIndex(
  songs: { songId: string; orderIndex: number }[],
): { songId: string; orderIndex: number }[] {
  return [...songs].sort((a, b) => a.orderIndex - b.orderIndex);
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function StageSetlistPage() {
  const { sets, songs, lastSyncTimestamp, isLoading, error } = useStageData();
  const { lastSync } = usePreflightCheck();
  const [showPreflight, setShowPreflight] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<StageSettings>(() => loadStageSettings());

  const syncTimestamp = lastSync ?? lastSyncTimestamp;

  function handleSettingsChange(partial: Partial<StageSettings>) {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      saveStageSettings(updated);
      return updated;
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/50 text-sm">Wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Zurück zum Dashboard"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Setlist</h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Stage-Einstellungen öffnen"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          {/* Gear icon (Req 12.1) */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-4 pb-4">
          <p className="text-sm text-amber-400">{error}</p>
        </div>
      )}

      {/* Preflight section (Req 4.1–4.6) */}
      <div className="px-4 pb-6">
        {showPreflight ? (
          <PreflightCheck
            onComplete={() => setShowPreflight(false)}
            onError={() => setShowPreflight(false)}
          />
        ) : (
          <div className="space-y-2">
            {syncTimestamp && (
              <p
                data-testid="last-sync-timestamp"
                className="text-xs text-white/40"
                aria-label="Letzte Synchronisation"
              >
                Letzte Sync:{" "}
                <time dateTime={syncTimestamp}>
                  {new Date(syncTimestamp).toLocaleString("de-DE")}
                </time>
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowPreflight(true)}
              aria-label="Bühne vorbereiten"
              data-testid="preflight-button"
              className="w-full rounded-lg bg-white py-3 text-sm font-bold text-black transition-colors hover:bg-white/90"
            >
              Bühne vorbereiten
            </button>
          </div>
        )}
      </div>

      {/* Sets and songs (Req 5.1, 5.2, 5.3) */}
      <div className="px-4 pb-8 space-y-6">
        {sets.length === 0 && !error && (
          <p className="text-sm text-white/40">
            Keine Sets vorhanden. Bitte zuerst synchronisieren.
          </p>
        )}

        {sets.map((set) => {
          const sortedSongs = sortSongsByOrderIndex(set.songs);

          return (
            <section key={set.id} aria-label={`Set: ${set.name}`}>
              <h2 className="mb-2 text-base font-semibold text-white/80">
                {set.name}
              </h2>
              {set.description && (
                <p className="mb-3 text-xs text-white/40">{set.description}</p>
              )}
              <ul role="list" className="space-y-1">
                {sortedSongs.map(({ songId }, idx) => {
                  const song = songs.get(songId);
                  if (!song) return null;

                  return (
                    <li key={songId}>
                      <Link
                        href={`/stage/${songId}`}
                        aria-label={`${song.titel}${song.kuenstler ? ` – ${song.kuenstler}` : ""}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/10 active:bg-white/20"
                      >
                        <span className="w-6 text-right text-xs text-white/30">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {song.titel}
                          </p>
                          {song.kuenstler && (
                            <p className="truncate text-xs text-white/50">
                              {song.kuenstler}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Settings dialog (Req 12.1) */}
      <StageEinstellungsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}
