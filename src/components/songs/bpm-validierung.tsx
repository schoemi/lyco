"use client";

interface BpmValidierungProps {
  manuellBpm: number;
  detektiertBpm: number;
  abweichungProzent: number;
  uebereinstimmung: boolean;
  onDetektiertenWertUebernehmen: () => void;
}

/**
 * BPM-Validierungs-Komponente.
 * Zeigt Bestätigung wenn Abweichung < 5%.
 * Zeigt Warnung mit detektiertem BPM-Wert als Alternative wenn Abweichung >= 5%.
 * Button zum Übernehmen des detektierten Werts.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export default function BpmValidierung({
  manuellBpm,
  detektiertBpm,
  abweichungProzent,
  uebereinstimmung,
  onDetektiertenWertUebernehmen,
}: BpmValidierungProps) {
  if (uebereinstimmung) {
    return (
      <div
        className="rounded-lg border border-success-200 bg-success-50 px-4 py-3"
        role="status"
      >
        <p className="text-sm text-success-700">
          ✓ Der eingegebene Wert ({manuellBpm} BPM) stimmt mit der Erkennung
          überein (Abweichung: {abweichungProzent.toFixed(1)}%).
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 space-y-2"
      role="alert"
    >
      <p className="text-sm text-warning-700">
        ⚠ Der eingegebene Wert ({manuellBpm} BPM) weicht um{" "}
        {abweichungProzent.toFixed(1)}% vom erkannten Wert ({detektiertBpm}{" "}
        BPM) ab.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDetektiertenWertUebernehmen}
          className="rounded-md border border-warning-300 px-3 py-1 text-xs font-medium text-warning-700 hover:bg-warning-100"
        >
          Erkannten Wert ({detektiertBpm} BPM) übernehmen
        </button>
      </div>
    </div>
  );
}
