"use client";

import { useEffect, useState } from "react";

/**
 * Client-side health check component.
 * On mount, calls /api/health to verify database connectivity.
 * Shows a persistent banner if the database is unreachable.
 */
export function HealthCheck() {
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) {
          setDbError(true);
        }
      } catch {
        setDbError(true);
      }
    }
    checkHealth();
  }, []);

  if (!dbError) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[9999] bg-error-600 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
    >
      ⚠️ Datenbankverbindung fehlgeschlagen — einige Funktionen sind nicht verfügbar.
      Bitte stelle sicher, dass die Datenbank läuft.
    </div>
  );
}
