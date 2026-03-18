"use client";

import { useEffect, useRef } from "react";

interface EingabeBereichProps {
  eingabe: string;
  onEingabeChange: (value: string) => void;
  onAbsenden: () => void;
  onWeiter: () => void;
  status: "eingabe" | "korrekt" | "loesung";
  fehlversuche: number;
  disabled: boolean;
  istLetzteZeile: boolean;
}

export function EingabeBereich({
  eingabe,
  onEingabeChange,
  onAbsenden,
  onWeiter,
  status,
  fehlversuche,
  disabled,
  istLetzteZeile,
}: EingabeBereichProps) {
  const weiterRef = useRef<HTMLButtonElement>(null);
  const istDeaktiviert = disabled || status === "korrekt" || status === "loesung";
  const istWeiterAktiv = status === "korrekt" || status === "loesung";

  // Focus the "Weiter" button when status changes to korrekt/loesung
  useEffect(() => {
    if (istWeiterAktiv) {
      weiterRef.current?.focus();
    }
  }, [istWeiterAktiv]);

  const borderClass =
    status === "korrekt"
      ? "border-success-500"
      : status === "eingabe" && fehlversuche > 0
        ? "border-error-500"
        : "border-neutral-300";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (istWeiterAktiv) {
        onWeiter();
      } else if (!istDeaktiviert) {
        onAbsenden();
      }
    }
  };

  const feedbackText =
    status === "korrekt"
      ? "Richtig!"
      : status === "loesung"
        ? "Lösung angezeigt"
        : fehlversuche > 0
          ? "Falsch – versuche es erneut"
          : "";

  return (
    <div className="space-y-3">
      <textarea
        value={eingabe}
        onChange={(e) => onEingabeChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={istDeaktiviert}
        aria-label="Zeile aus dem Gedächtnis eingeben"
        className={`w-full rounded-md border-2 ${borderClass} p-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100 disabled:cursor-not-allowed`}
        rows={2}
      />

      <div aria-live="polite" className="text-sm min-h-[1.25rem]">
        {feedbackText && (
          <span
            className={
              status === "korrekt"
                ? "text-success-600 font-medium"
                : status === "loesung"
                  ? "text-warning-600 font-medium"
                  : "text-error-600 font-medium"
            }
          >
            {feedbackText}
          </span>
        )}
      </div>

      <button
        ref={weiterRef}
        onClick={onWeiter}
        disabled={status === "eingabe"}
        className="min-h-[44px] w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
      >
        {istLetzteZeile ? "Strophe abschließen" : "Weiter"}
      </button>
    </div>
  );
}
