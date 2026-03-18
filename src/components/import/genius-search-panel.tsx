"use client";

import { useState } from "react";
import type { GeniusSearchResult } from "@/types/genius";

export interface GeniusSearchPanelProps {
  onImportSuccess: (songId: string) => void;
  onError: (message: string) => void;
}

export function GeniusSearchPanel({ onImportSuccess, onError }: GeniusSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeniusSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;

    setError("");
    setSearching(true);
    setResults([]);
    setHasSearched(false);

    try {
      const res = await fetch("/api/songs/genius/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "Genius-Suche fehlgeschlagen";
        setError(msg);
        onError(msg);
        setSearching(false);
        return;
      }

      const data = await res.json();
      setResults(data.results ?? []);
      setHasSearched(true);
    } catch {
      const msg = "Verbindung zu Genius fehlgeschlagen. Bitte versuche es erneut.";
      setError(msg);
      onError(msg);
    } finally {
      setSearching(false);
    }
  }

  async function handleImport(result: GeniusSearchResult) {
    setError("");
    setImporting(true);

    try {
      const res = await fetch("/api/songs/genius/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geniusId: result.id,
          title: result.title,
          artist: result.artist,
          geniusUrl: result.url,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "Import fehlgeschlagen";
        setError(msg);
        onError(msg);
        setImporting(false);
        return;
      }

      const data = await res.json();
      onImportSuccess(data.song.id);
    } catch {
      const msg = "Verbindung zu Genius fehlgeschlagen. Bitte versuche es erneut.";
      setError(msg);
      onError(msg);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          aria-label="Genius-Suche"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Song oder Künstler suchen…"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
        />
        <button
          type="submit"
          disabled={searching || importing || query.trim().length < 2}
          aria-label="Suchen"
          className="min-h-[44px] rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? "Suche…" : "Suchen"}
        </button>
      </form>

      {error && (
        <div role="alert" className="rounded-md bg-error-50 p-3 text-sm text-error-700">
          {error}
        </div>
      )}

      {searching && (
        <div className="flex items-center justify-center py-8 text-sm text-neutral-500">
          <svg className="mr-2 h-5 w-5 animate-spin text-newsong-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Suche läuft…
        </div>
      )}

      {importing && (
        <div className="flex items-center justify-center py-8 text-sm text-neutral-500">
          <svg className="mr-2 h-5 w-5 animate-spin text-newsong-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Song wird importiert…
        </div>
      )}

      {!searching && !importing && hasSearched && results.length === 0 && (
        <p className="py-4 text-center text-sm text-neutral-500">Keine Ergebnisse gefunden</p>
      )}

      {!searching && !importing && results.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => handleImport(result)}
                disabled={importing}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {result.albumArt ? (
                  <img
                    src={result.albumArt}
                    alt={`Album-Cover für ${result.title}`}
                    className="h-12 w-12 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-neutral-200 text-neutral-400">
                    ♪
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{result.title}</p>
                  <p className="truncate text-sm text-neutral-500">{result.artist}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
