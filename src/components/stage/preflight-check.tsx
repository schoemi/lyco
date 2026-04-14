"use client";

import { usePreflightCheck } from "@/lib/stage/use-preflight-check";

export interface PreflightCheckProps {
  onComplete: () => void;
  onError: (failedSongs: string[]) => void;
}

/**
 * PreflightCheck-Komponente — "Bühne vorbereiten"
 *
 * Zeigt:
 * - Button zum Starten des Preflight-Checks (Req 4.1)
 * - Fortschrittsbalken während des Ladens (Req 4.3)
 * - Bestätigung mit Zeitstempel nach Abschluss (Req 4.4, 4.6)
 * - Liste fehlgeschlagener Songs (Req 4.5)
 * - Warnung bei abgelehntem navigator.storage.persist() (Req 3.5)
 */
export function PreflightCheck({ onComplete, onError }: PreflightCheckProps) {
  const { start, isRunning, progress, failedSongs, lastSync, persistWarning } =
    usePreflightCheck();

  const hasCompleted = !isRunning && lastSync !== null;
  const hasProgress = progress.total > 0;

  async function handleStart() {
    await start();
    const failed = failedSongs;
    if (failed.length > 0) {
      onError(failed);
    } else {
      onComplete();
    }
  }

  return (
    <div
      role="region"
      aria-label="Bühne vorbereiten"
      style={{ color: "#FFFFFF", backgroundColor: "#000000", padding: "1rem" }}
    >
      {/* Persist-Warnung (Req 3.5) */}
      {persistWarning && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="persist-warning"
          style={{ color: "#F5A623", marginBottom: "0.5rem" }}
        >
          Warnung: Der Cache könnte bei Speicherknappheit gelöscht werden.
          Bitte stelle sicher, dass genügend Speicherplatz vorhanden ist.
        </div>
      )}

      {/* Letzter Sync-Zeitstempel (Req 4.6) */}
      {lastSync && (
        <p data-testid="last-sync" aria-label="Letzte Synchronisation">
          Letzte Synchronisation:{" "}
          <time dateTime={lastSync}>
            {new Date(lastSync).toLocaleString("de-DE")}
          </time>
        </p>
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
          style={{ margin: "0.5rem 0" }}
        >
          <div style={{ marginBottom: "0.25rem" }}>
            {progress.loaded} / {progress.total} Songs geladen
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#333333",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                width: `${(progress.loaded / progress.total) * 100}%`,
                height: "100%",
                backgroundColor: "#FFFFFF",
                borderRadius: "4px",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Fehlgeschlagene Songs (Req 4.5) */}
      {failedSongs.length > 0 && (
        <div data-testid="failed-songs" style={{ marginTop: "0.5rem" }}>
          <p style={{ color: "#F5A623" }}>
            Folgende Songs konnten nicht geladen werden:
          </p>
          <ul aria-label="Fehlgeschlagene Songs">
            {failedSongs.map((song) => (
              <li key={song} style={{ color: "#F5A623" }}>
                {song}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Erfolgsmeldung (Req 4.4) */}
      {hasCompleted && failedSongs.length === 0 && (
        <p data-testid="success-message" style={{ color: "#FFFFFF" }}>
          Alle Songs erfolgreich synchronisiert.
        </p>
      )}

      {/* Start-Button (Req 4.1) */}
      <button
        type="button"
        onClick={handleStart}
        disabled={isRunning}
        aria-label="Bühne vorbereiten"
        data-testid="start-button"
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1.5rem",
          backgroundColor: isRunning ? "#333333" : "#FFFFFF",
          color: "#000000",
          border: "none",
          borderRadius: "4px",
          cursor: isRunning ? "not-allowed" : "pointer",
          fontWeight: "bold",
        }}
      >
        {isRunning ? "Wird vorbereitet…" : "Bühne vorbereiten"}
      </button>
    </div>
  );
}
