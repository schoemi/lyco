"use client";

import { useEffect, useRef, useState } from "react";
import LanguageSelector from "./language-selector";
import TranslateButton from "./translate-button";
import { AppIcon } from "@/components/ui/iconify-icon";

interface SongActionMenuProps {
  songId: string;
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
  songId,
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
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  async function handleExport() {
    setExporting(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/songs/${songId}/export`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export fehlgeschlagen (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `song-${songId}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  }

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
            {analyzing ? "Analysiert…" : <><AppIcon icon="lucide:search" className="inline mr-1.5 text-base align-[-2px]" /> Analysieren</>}
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
            <AppIcon icon="lucide:pencil" className="inline mr-1.5 text-base align-[-2px]" /> Bearbeiten
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
            <AppIcon icon="lucide:file-text" className="inline mr-1.5 text-base align-[-2px]" /> Text bearbeiten
          </button>

          <div className="border-t border-neutral-100 my-1" />

          {/* Exportieren */}
          <button
            type="button"
            role="menuitem"
            onClick={handleExport}
            disabled={exporting}
            className="flex w-full items-center px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "Exportiert…" : <><AppIcon icon="lucide:package" className="inline mr-1.5 text-base align-[-2px]" /> Exportieren</>}
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
            <AppIcon icon="lucide:trash-2" className="inline mr-1.5 text-base align-[-2px]" /> Löschen
          </button>
        </div>
      )}
    </div>
  );
}
