"use client";

export const SPRACHEN = [
  { value: "Deutsch", label: "Deutsch" },
  { value: "Englisch", label: "Englisch" },
  { value: "Spanisch", label: "Spanisch" },
  { value: "Französisch", label: "Französisch" },
  { value: "Italienisch", label: "Italienisch" },
  { value: "Portugiesisch", label: "Portugiesisch" },
];

interface LanguageSelectorProps {
  value: string;
  onChange: (sprache: string) => void;
  disabled?: boolean;
}

export default function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="zielsprache-select" className="text-sm font-medium text-neutral-700">
        Zielsprache
      </label>
      <select
        id="zielsprache-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Zielsprache auswählen"
        className="min-h-[44px] rounded-md border border-newsong-300 px-3 py-1.5 text-sm font-medium text-newsong-700 hover:bg-newsong-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {SPRACHEN.map((sprache) => (
          <option key={sprache.value} value={sprache.value}>
            {sprache.label}
          </option>
        ))}
      </select>
    </div>
  );
}
