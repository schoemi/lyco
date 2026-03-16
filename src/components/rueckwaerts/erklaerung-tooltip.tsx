"use client";

import { useCallback, useEffect, useRef } from "react";

interface ErklaerungTooltipProps {
  visible: boolean;
  onClose: () => void;
}

export function ErklaerungTooltip({ visible, onClose }: ErklaerungTooltipProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
    [onClose]
  );

  useEffect(() => {
    if (!visible) return;

    // Focus the close button when dialog opens
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="erklaerung-tooltip-title"
        className="relative z-10 mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2
          id="erklaerung-tooltip-title"
          className="mb-3 text-lg font-semibold text-gray-900"
        >
          Warum von hinten?
        </h2>

        <p className="mb-5 text-sm leading-relaxed text-gray-600">
          Beim normalen Lernen kennt man den Anfang eines Songs oft auswendig,
          wird aber zur Mitte hin unsicher – das ist der sogenannte
          Primacy-Effekt. Indem du mit der letzten Strophe beginnst, baust du
          Sicherheit von hinten nach vorne auf und erreichst eine gleichmäßige
          Textsicherheit über den gesamten Song.
        </p>

        <div className="flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Erklärung schließen"
            className="min-h-[44px] min-w-[44px] rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
