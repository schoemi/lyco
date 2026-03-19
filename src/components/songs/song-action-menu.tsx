"use client";

import { useEffect, useRef, useState } from "react";
import LanguageSelector from "./language-selector";
import TranslateButton from "./translate-button";

interface SongActionMenuProps {
  analyzing: boolean;
  translating: boolean;
  zielsprache: string;
  hasTranslations: boolean;
  onAnalyze: () => void;
  onTranslate: () => void;
  onEdit: () => void;
  onEditText: () => void;
  onDelete: () => void;
  onZielspracheChange: (sprache: string) => void;
}

export default function SongActionMenu({
  analyzing,
  translating,
  zielsprache,
  hasTranslations,
  onAnalyze,
  onTranslate,
  onEdit,
  onEditText,
  onDelete,
  onZielspracheChange,
}: SongActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Aktionen"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-neutral-700 hover:bg-neutral-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {/* Analysieren */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onAnalyze();
              setOpen(false);
            }}
            disabled={analyzing}
            className="flex w-full items-center px-4 py-2.5 text-sm text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? "Analysiert…" : "🔍 Analysieren"}
          </button>

          <div className="border-t border-neutral-100 my-1" />

          {/* Zielsprache + Übersetzen */}
          <div className="px-4 py-2.5 space-y-2">
            <LanguageSelector
              value={zielsprache}
              onChange={onZielspracheChange}
              disabled={translating}
            />
            <TranslateButton translating={translating} onClick={() => {
              onTranslate();
              setOpen(false);
            }} />
          </div>

          <div className="border-t border-neutral-100 my-1" />

          {/* Bearbeiten */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="flex w-full items-center px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            ✏️ Bearbeiten
          </button>

          {/* Volltext bearbeiten */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEditText();
              setOpen(false);
            }}
            className="flex w-full items-center px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            📝 Text bearbeiten
          </button>

          {/* Löschen */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="flex w-full items-center px-4 py-2.5 text-sm text-error-700 hover:bg-error-50"
          >
            🗑️ Löschen
          </button>
        </div>
      )}
    </div>
  );
}
