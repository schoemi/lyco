"use client";

import { useEffect, useRef } from "react";
import { usePreflightCheck } from "@/lib/stage/use-preflight-check";

export interface PreflightCheckProps {
  onComplete: () => void;
  onError: (failedSongs: string[]) => void;
}

/**
 * PreflightCheck-Komponente — "Bühne vorbereiten"
 *
 * Startet die Synchronisation automatisch beim Einblenden.
 * Zeigt:
 * - Fortschrittsbalken während des Ladens (Req 4.3)
 * - Bestätigung mit Zeitstempel nach Abschluss (Req 4.4, 4.6)
 * - Liste fehlgeschlagener Songs (Req 4.5)
 * - Warnung bei abgelehntem navigator.storage.persist() (Req 3.5)
 */
export function PreflightCheck({ onComplete, onError }: PreflightCheckProps) {
  const { start, isRunning, progress, failedSongs, lastSync, persistWarning } =
    usePreflightCheck();

  const hasStarted = useRef(false);
  const hasCompleted = !isRunning && lastSync !== null;
  const hasProgress = progress.total > 0;

  // Automatisch starten beim Mounten
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    start().then(() => {
      // failedSongs wird nach start() aktualisiert — kurz warten bis State gesetzt ist
    });
  }, [start]);

  // Ergebnis melden wenn fertig
  useEffect(() => {
    if (isRunning || !hasStarted.current) return;
    if (!lastSync) return;

    if (failedSongs.length > 0) {
      onError(failedSongs);
    } else {
      onComplete();
    }
  }, [isRunning, lastSync, failedSongs, onComplete, onError]);

  return (
    <div
      role="region"
      aria-label="Bühne vorbereiten"
      className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white/90">Synchronisation</h3>

      {/* Persist-Warnung (Req 3.5) */}
      {persistWarning && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="persist-warning"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400"
        >
          Der Cache könnte bei Speicherknappheit gelöscht werden.
          Bitte stelle sicher, dass genügend Speicherplatz vorhanden ist.
        </div>
      )}

      {/* Fortschrittsbalken (Req 4.3) */}
      {isRunning && hasProgress && (
        <div
          role="progressbar"
          aria-label="Songs werden geladen"
          aria-valuenow={progress.loaded}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          data-testid="progress-bar"
          className="space-y-2"
        >
          <p className="text-sm text-white/70">
            {progress.loaded} / {progress.total} Songs geladen
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-200 ease-out"
              style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Ladeindikator wenn noch kein Fortschritt bekannt */}
      {isRunning && !hasProgress && (
        <p className="text-sm text-white/50">Verbinde…</p>
      )}

      {/* Fehlgeschlagene Songs (Req 4.5) */}
      {!isRunning && failedSongs.length > 0 && (
        <div data-testid="failed-songs" className="space-y-1">
          <p className="text-sm font-medium text-amber-400">
            Folgende Songs konnten nicht geladen werden:
          </p>
          <ul aria-label="Fehlgeschlagene Songs" className="list-disc pl-5 space-y-0.5">
            {failedSongs.map((song) => (
              <li key={song} className="text-sm text-amber-400">
                {song}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Erfolgsmeldung (Req 4.4) */}
      {hasCompleted && failedSongs.length === 0 && (
        <div data-testid="success-message" className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="shrink-0 text-emerald-400" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-emerald-400">Alle Songs synchronisiert</p>
        </div>
      )}

      {/* Letzter Sync-Zeitstempel (Req 4.6) */}
      {!isRunning && lastSync && (
        <p data-testid="last-sync" aria-label="Letzte Synchronisation" className="text-xs text-white/40">
          Letzte Synchronisation:{" "}
          <time dateTime={lastSync}>
            {new Date(lastSync).toLocaleString("de-DE")}
          </time>
        </p>
      )}

      {/* Erneut-Button nur nach Abschluss (Req 4.1) */}
      {!isRunning && hasCompleted && (
        <button
          type="button"
          onClick={() => { hasStarted.current = false; start(); }}
          aria-label="Erneut synchronisieren"
          data-testid="start-button"
          className="w-full rounded-lg border border-white/20 bg-white/10 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          Erneut synchronisieren
        </button>
      )}
    </div>
  );
}
