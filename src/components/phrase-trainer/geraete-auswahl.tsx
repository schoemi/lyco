"use client";

import { useCallback, useId } from "react";
import { AppIcon } from "@/components/ui/iconify-icon";

interface GeraeteAuswahlProps {
  geraete: MediaDeviceInfo[];
  ausgewaehltesGeraetId: string;
  onGeraetAendern: (deviceId: string) => void;
  deaktiviert?: boolean;
}

/**
 * Dropdown zur Auswahl des Mikrofon-Eingabegeräts.
 *
 * Wird nur angezeigt, wenn mehr als ein Audio-Eingabegerät verfügbar ist.
 * Das erste verfügbare Gerät wird automatisch vorausgewählt (durch den
 * übergeordneten Zustand). Während der Aufnahme wird die Auswahl
 * deaktiviert (`deaktiviert`).
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export function GeraeteAuswahl({
  geraete,
  ausgewaehltesGeraetId,
  onGeraetAendern,
  deaktiviert = false,
}: GeraeteAuswahlProps) {
  const selectId = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onGeraetAendern(e.target.value);
    },
    [onGeraetAendern],
  );

  // Req 8.1: Nur anzeigen wenn mehr als ein Gerät verfügbar
  if (geraete.length <= 1) {
    return null;
  }

  return (
    <div className="w-full max-w-xs">
      <label
        htmlFor={selectId}
        className="mb-1 flex items-center gap-1 text-xs text-white/60"
      >
        <AppIcon icon="lucide:mic" className="text-sm" />
        Mikrofon
      </label>

      {/* Req 8.3 / 8.4: Auswahl nur möglich wenn nicht aufgenommen wird */}
      <select
        id={selectId}
        value={ausgewaehltesGeraetId}
        onChange={handleChange}
        disabled={deaktiviert}
        className="w-full rounded-md border border-white/20 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Mikrofon auswählen"
      >
        {geraete.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Mikrofon (${d.deviceId.slice(0, 8)}…)`}
          </option>
        ))}
      </select>
    </div>
  );
}
