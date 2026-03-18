"use client";

interface TranslationToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function TranslationToggle({ checked, onChange }: TranslationToggleProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Übersetzung ein-/ausblenden"
      onClick={() => onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        checked
          ? "border-newsong-300 text-newsong-700 bg-newsong-50 hover:bg-newsong-100"
          : "border-neutral-300 text-neutral-500 bg-white hover:bg-neutral-50"
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-newsong-600" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      Übersetzung
    </button>
  );
}
