"use client";

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
  const istDeaktiviert = disabled || status === "korrekt" || status === "loesung";

  const borderClass =
    status === "korrekt"
      ? "border-green-500"
      : status === "eingabe" && fehlversuche > 0
        ? "border-red-500"
        : "border-gray-300";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!istDeaktiviert) {
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
        className={`w-full rounded-md border-2 ${borderClass} p-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
        rows={2}
      />

      <div aria-live="polite" className="text-sm min-h-[1.25rem]">
        {feedbackText && (
          <span
            className={
              status === "korrekt"
                ? "text-green-600 font-medium"
                : status === "loesung"
                  ? "text-orange-600 font-medium"
                  : "text-red-600 font-medium"
            }
          >
            {feedbackText}
          </span>
        )}
      </div>

      <button
        onClick={onWeiter}
        disabled={status === "eingabe"}
        className="min-h-[44px] w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {istLetzteZeile ? "Strophe abschließen" : "Weiter"}
      </button>
    </div>
  );
}
