"use client";

import type { ImportMode } from "@/types/import";

interface ImportTabsProps {
  active: ImportMode;
  onChange: (mode: ImportMode) => void;
}

const tabs: { mode: ImportMode; label: string }[] = [
  { mode: "manuell", label: "Manuell" },
  { mode: "text", label: "Text einfügen" },
  { mode: "pdf", label: "PDF Upload" },
  { mode: "genius", label: "Genius" },
];

export function ImportTabs({ active, onChange }: ImportTabsProps) {
  return (
    <div role="tablist" aria-label="Import-Methode" className="flex gap-1 border-b border-neutral-200">
      {tabs.map(({ mode, label }) => (
        <button
          key={mode}
          role="tab"
          aria-selected={active === mode}
          aria-controls={`tabpanel-${mode}`}
          onClick={() => onChange(mode)}
          className={`min-h-[44px] px-4 py-2 text-sm font-medium transition-colors ${
            active === mode
              ? "border-b-2 border-newsong-600 bg-newsong-50 text-newsong-700"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
