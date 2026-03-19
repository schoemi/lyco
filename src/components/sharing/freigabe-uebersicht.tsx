"use client";

import { useCallback, useEffect, useState } from "react";

interface FreigabeEmpfaenger {
  id: string;
  empfaenger: { id: string; name: string; email: string };
  erstelltAm: string;
}

interface FreigabeUebersichtProps {
  type: "song" | "set";
  itemId: string;
}

export default function FreigabeUebersicht({
  type,
  itemId,
}: FreigabeUebersichtProps) {
  const [freigaben, setFreigaben] = useState<FreigabeEmpfaenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    type === "song"
      ? `/api/freigaben/songs/${itemId}`
      : `/api/freigaben/sets/${itemId}`;

  const fetchFreigaben = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const data = await res.json();
      setFreigaben(data.freigaben ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchFreigaben();
  }, [fetchFreigaben]);

  async function handleRevoke(freigabeId: string) {
    setRevoking(freigabeId);
    setError(null);
    try {
      const deleteEndpoint =
        type === "song"
          ? `/api/freigaben/songs/${freigabeId}`
          : `/api/freigaben/sets/${freigabeId}`;
      const res = await fetch(deleteEndpoint, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setConfirmId(null);
        await fetchFreigaben();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Fehler beim Widerrufen");
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Freigaben werden geladen…</p>;
  }

  if (freigaben.length === 0) {
    return null;
  }

  const label = type === "song" ? "Song" : "Set";

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        Freigaben ({freigaben.length})
      </h3>

      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
        {freigaben.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {f.empfaenger.name}
              </p>
              <p className="truncate text-sm text-gray-500">
                {f.empfaenger.email}
              </p>
            </div>

            {confirmId === f.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">
                  {label}-Freigabe für {f.empfaenger.name} wirklich widerrufen?
                </span>
                <button
                  onClick={() => handleRevoke(f.id)}
                  disabled={revoking === f.id}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {revoking === f.id ? "…" : "Ja"}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Nein
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(f.id)}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Widerrufen
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
