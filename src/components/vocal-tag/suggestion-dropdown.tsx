"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { TagDefinitionData, TagKategorieData } from "@/types/vocal-tag";
import {
  gruppiereTagsNachKategorie,
  filtereGruppierteTagDefinitionen,
} from "@/lib/vocal-tag/tag-gruppierung";

/**
 * SuggestionDropdown – React component for the autocomplete suggestion list.
 *
 * Renders a floating dropdown with tag definitions grouped by category.
 * Category headings are visually distinct and non-selectable.
 * Supports keyboard navigation (ArrowUp/ArrowDown) that skips headings,
 * selection (Enter/click), and dismissal (Escape).
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4
 */

export interface SuggestionDropdownProps {
  items: TagDefinitionData[];
  command: (item: TagDefinitionData) => void;
  kategorien?: TagKategorieData[];
}

export interface SuggestionDropdownRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SuggestionDropdown = forwardRef<
  SuggestionDropdownRef,
  SuggestionDropdownProps
>(({ items, command, kategorien = [] }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Group items by category. When kategorien are provided, use grouping;
  // otherwise fall back to a flat list (single group with null category).
  const gruppen = useMemo(() => {
    if (kategorien.length === 0) {
      // No categories: single flat group
      return items.length > 0 ? [{ kategorie: null, tags: items }] : [];
    }
    // Group all items by category, then filter out empty groups
    const alleGruppen = gruppiereTagsNachKategorie(items, kategorien);
    // filtereGruppierteTagDefinitionen with empty string returns all, but removes empty groups
    return filtereGruppierteTagDefinitionen(alleGruppen, "");
  }, [items, kategorien]);

  // Flat list of selectable tag items (for keyboard navigation indexing)
  const selectableItems = useMemo(() => {
    return gruppen.flatMap((g) => g.tags);
  }, [gruppen]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = selectableItems[index];
      if (item) {
        command(item);
      }
    },
    [selectableItems, command],
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) =>
          prev <= 0 ? selectableItems.length - 1 : prev - 1,
        );
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) =>
          prev >= selectableItems.length - 1 ? 0 : prev + 1,
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

  if (selectableItems.length === 0) {
    return (
      <div className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
        <div className="px-3 py-2 text-sm text-neutral-400">
          Keine Tags gefunden
        </div>
      </div>
    );
  }

  // Track the running index across groups for keyboard selection highlighting
  let runningIndex = 0;
  const hasMultipleGroups = gruppen.length > 1 || (gruppen.length === 1 && kategorien.length > 0);

  return (
    <div
      className="z-50 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
      role="listbox"
      aria-label="Verfügbare Vocal-Tags"
    >
      {gruppen.map((gruppe, gruppeIndex) => {
        const groupStartIndex = runningIndex;

        const groupElements = (
          <div key={gruppe.kategorie?.id ?? "__ohne_kategorie"} role="group" aria-label={gruppe.kategorie?.title ?? "Ohne Kategorie"}>
            {/* Category heading – only shown when categories are available */}
            {hasMultipleGroups && (
              <>
                {gruppeIndex > 0 && (
                  <div className="mx-2 my-1 border-t border-neutral-100" role="separator" />
                )}
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400"
                  role="presentation"
                  aria-hidden="true"
                >
                  {gruppe.kategorie?.title ?? "Ohne Kategorie"}
                </div>
              </>
            )}
            {/* Tag items in this group */}
            {gruppe.tags.map((item) => {
              const itemIndex = runningIndex++;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={itemIndex === selectedIndex}
                  onClick={() => selectItem(itemIndex)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                    itemIndex === selectedIndex
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
              );
            })}
          </div>
        );

        return groupElements;
      })}
    </div>
  );
});

SuggestionDropdown.displayName = "SuggestionDropdown";
