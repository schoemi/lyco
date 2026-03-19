"use client";

export type StrophenViewMode = "normal" | "markup" | "translation";

export interface StrophenViewToggleProps {
  mode: StrophenViewMode;
  onChange: (mode: StrophenViewMode) => void;
  hasTranslations?: boolean;
  hasMarkup?: boolean;
}

const modes: { value: StrophenViewMode; label: string; icon: string }[] = [
  { value: "normal", label: "Normal", icon: "📄" },
  { value: "markup", label: "Vocal Tags", icon: "🎤" },
  { value: "translation", label: "Übersetzung", icon: "🌐" },
];

export function StrophenViewToggle({
  mode,
  onChange,
  hasTranslations = true,
  hasMarkup = true,
}: StrophenViewToggleProps) {
  const available = modes.filter((m) => {
    if (m.value === "translation" && !hasTranslations) return false;
    return true;
  });

  if (available.length <= 1) return null;

  return (
    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5" role="radiogroup" aria-label="Strophen-Ansicht">
      {available.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={mode === m.value}
          onClick={() => onChange(m.value)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === m.value
              ? "bg-newsong-100 text-newsong-700 shadow-sm"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          <span aria-hidden="true">{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
