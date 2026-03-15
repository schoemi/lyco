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
];

export function ImportTabs({ active, onChange }: ImportTabsProps) {
  return (
    <div role="tablist" aria-label="Import-Methode" className="flex gap-1 border-b border-gray-200">
      {tabs.map(({ mode, label }) => (
        <button
          key={mode}
          role="tab"
          aria-selected={active === mode}
          aria-controls={`tabpanel-${mode}`}
          onClick={() => onChange(mode)}
          className={`min-h-[44px] px-4 py-2 text-sm font-medium transition-colors ${
            active === mode
              ? "border-b-2 border-blue-600 bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
