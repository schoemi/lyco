"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * SuggestionDropdown – React component for the autocomplete suggestion list.
 *
 * Renders a floating dropdown with tag definitions filtered by the current query.
 * Supports keyboard navigation (ArrowUp/ArrowDown), selection (Enter/click),
 * and dismissal (Escape).
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

export interface SuggestionDropdownProps {
  items: TagDefinitionData[];
  command: (item: TagDefinitionData) => void;
}

export interface SuggestionDropdownRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SuggestionDropdown = forwardRef<
  SuggestionDropdownRef,
  SuggestionDropdownProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command],
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) =>
          prev <= 0 ? items.length - 1 : prev - 1,
        );
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) =>
          prev >= items.length - 1 ? 0 : prev + 1,
        );
        return true;
      }

      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }

      if (event.key === "Escape") {
        return true;
      }

      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
        <div className="px-3 py-2 text-sm text-neutral-400">
          Keine Tags gefunden
        </div>
      </div>
    );
  }

  return (
    <div
      className="z-50 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
      role="listbox"
      aria-label="Verfügbare Vocal-Tags"
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
            index === selectedIndex
              ? "bg-primary-50 text-primary-900"
              : "text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <i
            className={item.icon}
            aria-hidden="true"
            style={{ color: item.color }}
          />
          <span className="flex-1 font-medium">{item.label}</span>
          <span className="text-xs text-neutral-400">{item.tag}</span>
        </button>
      ))}
    </div>
  );
});

SuggestionDropdown.displayName = "SuggestionDropdown";
