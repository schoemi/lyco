"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface CoachBereichProps {
  songId: string;
  coachTipp: string | null;
  onCoachTippChanged: (tipp: string) => void;
}

export default function CoachBereich({
  songId,
  coachTipp,
  onCoachTippChanged,
}: CoachBereichProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileLink, setShowProfileLink] = useState(false);

  async function handleCoachClick() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setShowProfileLink(false);

    try {
      const res = await fetch(`/api/songs/${songId}/coach`, {
        method: "POST",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (res.status === 400 && json?.error) {
          setShowProfileLink(true);
          setError(json.error);
          return;
        }
        throw new Error(json?.error ?? "Coach-Anfrage fehlgeschlagen");
      }

      const result = await res.json();
      onCoachTippChanged(result.coachTipp);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-900">
        Gesangstechnik-Coach
      </h2>

      <button
        type="button"
        onClick={handleCoachClick}
        disabled={loading}
        className="rounded-md border border-success-300 px-3 py-1.5 text-sm font-medium text-success-700 hover:bg-success-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "Coach analysiert…"
          : coachTipp
            ? "Coach erneut befragen"
            : "Gesangstechnik-Coach"}
      </button>

      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          <p>{error}</p>
          {showProfileLink && (
            <Link
              href="/profile"
              className="mt-2 inline-block text-sm font-medium text-newsong-600 hover:text-newsong-800"
            >
              → Profil vervollständigen
            </Link>
          )}
        </div>
      )}

      {coachTipp && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3">
          <p className="text-xs font-medium text-success-600 mb-1">
            Coach-Tipp
          </p>
          <div className="prose prose-sm max-w-none text-neutral-800 prose-headings:text-neutral-900 prose-headings:text-base prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown>{coachTipp}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
