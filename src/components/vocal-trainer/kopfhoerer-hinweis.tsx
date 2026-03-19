"use client";

import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "vocal-trainer-kopfhoerer-bestaetigt";

interface KopfhoererHinweisProps {
  onBestaetigt: () => void;
}

export function KopfhoererHinweis({ onBestaetigt }: KopfhoererHinweisProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const bestaetigen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage may be unavailable (e.g. private browsing)
    }
    onBestaetigt();
  }, [onBestaetigt]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        bestaetigen();
        return;
      }

      // Focus trap within dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [bestaetigen]
  );

  // Check localStorage — if already confirmed, call onBestaetigt immediately
  const alreadyConfirmed = (() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (alreadyConfirmed) {
      onBestaetigt();
    }
  }, [alreadyConfirmed, onBestaetigt]);

  useEffect(() => {
    if (alreadyConfirmed) return;

    requestAnimationFrame(() => {
      buttonRef.current?.focus();
    });

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [alreadyConfirmed, handleKeyDown]);

  if (alreadyConfirmed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Kopfhörer-Hinweis"
        className="relative z-10 mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">
          Kopfhörer empfohlen
        </h2>

        <p className="mb-5 text-sm leading-relaxed text-neutral-600">
          Bitte verwende Kopfhörer, bevor du die Aufnahme startest. Ohne
          Kopfhörer kann das Instrumental über die Lautsprecher in das Mikrofon
          gelangen und die Analyse deiner Stimme verfälschen.
        </p>

        <div className="flex justify-end">
          <button
            ref={buttonRef}
            type="button"
            onClick={bestaetigen}
            className="min-h-[44px] min-w-[44px] rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
