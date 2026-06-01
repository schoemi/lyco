"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import type { TagDefinitionData, TagKategorieData } from "@/types/vocal-tag";
import { gruppiereTagsNachKategorie } from "@/lib/vocal-tag/tag-gruppierung";

/**
 * VocalTagToolbar – Toolbar for inserting ChordPro vocal tags into the TipTap editor.
 *
 * - Top-5 tags (by indexNr) as direct buttons with icon and label in tag color
 * - Dropdown "Weitere Techniken" for remaining tags, grouped by category
 * - Category titles as non-selectable headings per group
 * - Groups sorted by category orderIndex
 * - Tags without category in a separate group at the end
 * - Button click inserts ChordPro tag at cursor position or before text selection
 * - aria-label on each button with tag label
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4
 */

export interface VocalTagToolbarProps {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Tag definitions sorted by indexNr */
  tagDefinitions: TagDefinitionData[];
  /** Tag categories for grouping the dropdown (optional for backward compatibility) */
  kategorien?: TagKategorieData[];
}

const TOP_COUNT = 5;

export function VocalTagToolbar({ editor, tagDefinitions, kategorien = [] }: VocalTagToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sorted = [...tagDefinitions].sort((a, b) => a.indexNr - b.indexNr);
  const topTags = sorted.slice(0, TOP_COUNT);

  // IDs of top-5 tags to exclude from dropdown
  const topTagIds = useMemo(() => new Set(topTags.map((t) => t.id)), [topTags]);

  // Tags for the dropdown: all tags except top-5
  const moreTags = useMemo(
    () => tagDefinitions.filter((td) => !topTagIds.has(td.id)),
    [tagDefinitions, topTagIds],
  );

  // Group dropdown tags by category using the grouping function
  const gruppierteDropdownTags = useMemo(
    () => gruppiereTagsNachKategorie(moreTags, kategorien),
    [moreTags, kategorien],
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [dropdownOpen]);

  const insertTag = useCallback(
    (tag: string) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection) {
        // Text is selected → apply range mark
        editor.chain().focus().setChordProMark({ tag }).run();
      } else {
        // No selection → insert inline tag node
        editor.chain().focus().insertChordProTag({ tag }).run();
      }

      setDropdownOpen(false);
    },
    [editor],
  );

  if (tagDefinitions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Vocal-Tag-Werkzeugleiste">
      {/* Top-5 direct buttons */}
      {topTags.map((td) => (
        <button
          key={td.id}
          type="button"
          onClick={() => insertTag(td.tag)}
          aria-label={td.label}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
          style={{
            color: td.color,
            borderColor: `${td.color}40`,
            backgroundColor: `${td.color}0d`,
          }}
        >
          <i className={td.icon} aria-hidden="true" />
          <span>{td.label}</span>
        </button>
      ))}

      {/* Dropdown for remaining tags, grouped by category */}
      {moreTags.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="Weitere Techniken"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            <span>Weitere Techniken</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              role="menu"
              className="absolute left-0 z-50 mt-1 max-h-[400px] min-w-[200px] origin-top-left overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
            >
              {gruppierteDropdownTags.map((gruppe, gruppeIndex) => (
                <div key={gruppe.kategorie?.id ?? "__ohne_kategorie"} role="group" aria-label={gruppe.kategorie?.title ?? "Ohne Kategorie"}>
                  {/* Category heading separator (not before first group) */}
                  {gruppeIndex > 0 && (
                    <div className="mx-2 my-1 border-t border-neutral-100" role="separator" />
                  )}
                  {/* Category title as non-selectable heading */}
                  <div
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400"
                    role="presentation"
                    aria-hidden="true"
                  >
                    {gruppe.kategorie?.title ?? "Ohne Kategorie"}
                  </div>
                  {/* Tag items in this group */}
                  {gruppe.tags.map((td) => (
                    <button
                      key={td.id}
                      type="button"
                      role="menuitem"
                      onClick={() => insertTag(td.tag)}
                      aria-label={td.label}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50"
                    >
                      <i className={td.icon} aria-hidden="true" style={{ color: td.color }} />
                      <span className="text-neutral-700">{td.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
