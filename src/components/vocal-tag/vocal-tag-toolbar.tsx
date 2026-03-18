"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * VocalTagToolbar – Toolbar for inserting ChordPro vocal tags into the TipTap editor.
 *
 * - Top-5 tags (by indexNr) as direct buttons with icon and label in tag color
 * - Dropdown "Weitere Techniken" for remaining tags
 * - Button click inserts ChordPro tag at cursor position or before text selection
 * - aria-label on each button with tag label
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

export interface VocalTagToolbarProps {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Tag definitions sorted by indexNr */
  tagDefinitions: TagDefinitionData[];
}

const TOP_COUNT = 5;

export function VocalTagToolbar({ editor, tagDefinitions }: VocalTagToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sorted = [...tagDefinitions].sort((a, b) => a.indexNr - b.indexNr);
  const topTags = sorted.slice(0, TOP_COUNT);
  const moreTags = sorted.slice(TOP_COUNT);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      editor.chain().focus().insertChordProTag({ tag }).run();
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

      {/* Dropdown for remaining tags */}
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
              className="absolute left-0 z-50 mt-1 min-w-[200px] origin-top-left rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
            >
              {moreTags.map((td) => (
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
          )}
        </div>
      )}
    </div>
  );
}
