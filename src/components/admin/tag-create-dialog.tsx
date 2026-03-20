"use client";

import { useState, useMemo } from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";
import { ICON_LIBRARIES, ALL_ICONS, type IconChoice } from "./icon-picker-data";

/**
 * Erstellungs-Dialog für neue Tag-Definitionen.
 *
 * Anforderungen: 3.4, 3.5, 3.6
 */

interface TagCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (tag: TagDefinitionData) => void;
}

export default function TagCreateDialog({ open, onClose, onCreated }: TagCreateDialogProps) {
  const [tag, setTag] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [indexNr, setIndexNr] = useState(1);
  const [iconSearch, setIconSearch] = useState("");
  const [activeLib, setActiveLib] = useState<string>("all");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredIcons = useMemo(() => {
    const source: IconChoice[] =
      activeLib === "all"
        ? ALL_ICONS
        : ICON_LIBRARIES.find((l) => l.id === activeLib)?.icons ?? ALL_ICONS;

    if (!iconSearch.trim()) return source;
    const q = iconSearch.toLowerCase();
    return source.filter(
      (i) => i.label.toLowerCase().includes(q) || i.icon.toLowerCase().includes(q),
    );
  }, [iconSearch, activeLib]);

  if (!open) return null;

  function resetForm() {
    setTag("");
    setLabel("");
    setIcon("");
    setColor("#3b82f6");
    setIndexNr(1);
    setIconSearch("");
    setActiveLib("all");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tag.trim()) { setError({ message: "Kürzel ist erforderlich", field: "tag" }); return; }
    if (!label.trim()) { setError({ message: "Label ist erforderlich", field: "label" }); return; }
    if (!icon.trim()) { setError({ message: "Bitte ein Icon auswählen", field: "icon" }); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/tag-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: tag.trim(),
          label: label.trim(),
          icon: icon.trim(),
          color,
          indexNr,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError({ message: data.error || "Fehler beim Erstellen", field: data.field });
        return;
      }

      onCreated(data.definition);
      resetForm();
    } catch {
      setError({ message: "Netzwerkfehler" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Neuen Tag erstellen</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="create-tag" className="block text-sm font-medium text-gray-700">Kürzel</label>
            <input
              id="create-tag"
              type="text"
              required
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="z.B. belt, falsett, vibrato"
              aria-label="Tag-Kürzel"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error?.field === "tag" ? "border-red-500" : "border-gray-300"
              }`}
            />
            {error?.field === "tag" && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
          </div>

          <div>
            <label htmlFor="create-label" className="block text-sm font-medium text-gray-700">Label</label>
            <input
              id="create-label"
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z.B. Belting, Falsett, Vibrato"
              aria-label="Tag-Label"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error?.field === "label" ? "border-red-500" : "border-gray-300"
              }`}
            />
            {error?.field === "label" && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
          </div>

          {/* Icon-Picker mit Bibliotheks-Tabs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <input
              type="text"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder="Icon suchen..."
              aria-label="Icon-Suche"
              className="mb-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Bibliotheks-Tabs */}
            <div className="mb-2 flex flex-wrap gap-1" role="tablist" aria-label="Icon-Bibliothek">
              <button
                type="button"
                role="tab"
                aria-selected={activeLib === "all"}
                onClick={() => setActiveLib("all")}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeLib === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Alle
              </button>
              {ICON_LIBRARIES.map((lib) => (
                <button
                  key={lib.id}
                  type="button"
                  role="tab"
                  aria-selected={activeLib === lib.id}
                  onClick={() => setActiveLib(lib.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeLib === lib.id
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {lib.name}
                </button>
              ))}
            </div>

            <div
              className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 p-2"
              role="tabpanel"
              aria-label="Icon-Auswahl"
            >
              {filteredIcons.map((ic) => (
                <button
                  key={ic.icon}
                  type="button"
                  onClick={() => setIcon(ic.icon)}
                  title={`${ic.label} (${ic.icon})`}
                  aria-label={`Icon: ${ic.label}`}
                  className={`flex items-center justify-center rounded p-2 text-lg hover:bg-gray-100 ${
                    icon === ic.icon ? "bg-blue-100 ring-2 ring-blue-500" : ""
                  }`}
                >
                  <AppIcon icon={ic.icon} color={color} />
                </button>
              ))}
              {filteredIcons.length === 0 && (
                <p className="col-span-8 py-2 text-center text-xs text-gray-400">Keine Icons gefunden</p>
              )}
            </div>
            {icon && (
              <p className="mt-1 text-xs text-gray-500">
                Gewählt: <AppIcon icon={icon} color={color} />{" "}
                <code className="rounded bg-gray-100 px-1">{icon}</code>
              </p>
            )}
            {error?.field === "icon" && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
          </div>

          <div>
            <label htmlFor="create-color" className="block text-sm font-medium text-gray-700">Farbe</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="create-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Tag-Farbe"
                className="h-10 w-10 cursor-pointer rounded border border-gray-300"
              />
              <span className="text-sm font-mono text-gray-500">{color}</span>
            </div>
          </div>

          <div>
            <label htmlFor="create-indexnr" className="block text-sm font-medium text-gray-700">Sortierung (indexNr)</label>
            <input
              id="create-indexnr"
              type="number"
              required
              min={0}
              value={indexNr}
              onChange={(e) => setIndexNr(parseInt(e.target.value, 10) || 0)}
              aria-label="Sortierungsnummer"
              className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && !error.field && <p className="text-sm text-red-600">{error.message}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Erstelle..." : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
