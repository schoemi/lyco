"use client";

const TABS = ["Übersetzung", "Interpretation", "Meine Notizen"] as const;

interface ModeTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ModeTabs({ activeTab, onTabChange }: ModeTabsProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, tab: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTabChange(tab);
    }
  }

  return (
    <div role="tablist" className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab)}
            onKeyDown={(e) => handleKeyDown(e, tab)}
            className={`min-h-[44px] min-w-[44px] flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
