"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AudioQuelleResponse } from "@/types/audio";

interface EinstellungsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scrollSpeed: number;
  onSpeedChange: (speed: number) => void;
  audioQuellen?: AudioQuelleResponse[];
  activeAudioQuelleId?: string | null;
  onAudioQuelleChange?: (quelleId: string | null) => void;
}

export function EinstellungsDialog({
  isOpen,
  onClose,
  scrollSpeed,
  onSpeedChange,
  audioQuellen,
  activeAudioQuelleId,
  onAudioQuelleChange,
}: EinstellungsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Einstellungen"
        className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-neutral-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Einstellungen</h2>
          <button
            onClick={onClose}
            aria-label="Dialog schließen"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <label className="mb-2 block text-sm text-white/70">
          Scroll-Geschwindigkeit
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={scrollSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            aria-label="Scroll-Geschwindigkeit in Sekunden"
            aria-valuemin={1}
            aria-valuemax={10}
            aria-valuenow={scrollSpeed}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
          />
          <span className="min-w-[2.5rem] text-right text-sm font-medium text-white">
            {scrollSpeed}s
          </span>
        </div>

        {/* Audio source selector */}
        {audioQuellen && audioQuellen.length > 0 && onAudioQuelleChange && (
          <div className="mt-5">
            <label
              htmlFor="karaoke-audio-quelle"
              className="mb-2 block text-sm text-white/70"
            >
              Audio-Quelle
            </label>
            <select
              id="karaoke-audio-quelle"
              value={activeAudioQuelleId ?? ""}
              onChange={(e) =>
                onAudioQuelleChange(e.target.value || null)
              }
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <option value="" className="bg-neutral-900 text-white">
                Keine
              </option>
              {audioQuellen.map((q) => (
                <option
                  key={q.id}
                  value={q.id}
                  className="bg-neutral-900 text-white"
                  disabled={q.typ !== "MP3"}
                >
                  {q.label || q.typ}{q.typ !== "MP3" ? ` (${q.typ} – nur Embed)` : ""}
                </option>
              ))}
            </select>
            {activeAudioQuelleId && (
              <p className="mt-1 text-xs text-white/50">
                Nur MP3-Quellen können im Karaoke-Modus abgespielt werden.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
