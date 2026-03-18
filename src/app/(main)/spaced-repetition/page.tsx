"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FaelligeStrophe } from "@/lib/services/spaced-repetition-service";

interface SongGruppe {
  songId: string;
  songTitel: string;
  strophen: FaelligeStrophe[];
}

export default function SpacedRepetitionUebersicht() {
  const router = useRouter();
  const [gruppen, setGruppen] = useState<SongGruppe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function laden() {
      try {
        const res = await fetch("/api/spaced-repetition/queue");
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error("Fehler beim Laden der fälligen Strophen");
        }
        const data = await res.json();
        const strophen: FaelligeStrophe[] = data.strophen;

        // Nach Songs gruppieren
        const map = new Map<string, SongGruppe>();
        for (const s of strophen) {
          if (!map.has(s.songId)) {
            map.set(s.songId, { songId: s.songId, songTitel: s.songTitel, strophen: [] });
          }
          map.get(s.songId)!.strophen.push(s);
        }
        setGruppen(Array.from(map.values()));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten");
      } finally {
        setLoading(false);
      }
    }
    laden();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-neutral-500">Fällige Strophen werden geladen…</div>
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

  const gesamtAnzahl = gruppen.reduce((sum, g) => sum + g.strophen.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">Spaced Repetition</h1>
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← Dashboard
        </Link>
      </div>

      {gesamtAnzahl === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-12 text-center">
          <p className="text-sm text-neutral-400">Keine Strophen fällig — gut gemacht!</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-neutral-600">
            {gesamtAnzahl} {gesamtAnzahl === 1 ? "Strophe" : "Strophen"} heute fällig
          </p>

          <div className="space-y-4">
            {gruppen.map((gruppe) => (
              <div
                key={gruppe.songId}
                className="rounded-lg border border-neutral-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    {gruppe.songTitel}
                  </h2>
                  <Link
                    href={`/songs/${gruppe.songId}/spaced-repetition`}
                    className="rounded-md bg-newsong-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-newsong-700"
                  >
                    Üben ({gruppe.strophen.length})
                  </Link>
                </div>
                <ul className="divide-y divide-neutral-50 px-4">
                  {gruppe.strophen.map((s) => (
                    <li key={s.wiederholungId} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-neutral-700">{s.stropheName}</span>
                      <span className="text-xs text-neutral-400">
                        {s.korrektZaehler === 0
                          ? "Neu"
                          : `${s.korrektZaehler}× korrekt`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
