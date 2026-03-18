"use client";

import { useState, useMemo } from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";

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

/** Common FontAwesome v6 icon classes for the icon picker */
const FA_ICONS: { cls: string; label: string }[] = [
  { cls: "fa-solid fa-microphone", label: "Microphone" },
  { cls: "fa-solid fa-music", label: "Music" },
  { cls: "fa-solid fa-guitar", label: "Guitar" },
  { cls: "fa-solid fa-drum", label: "Drum" },
  { cls: "fa-solid fa-headphones", label: "Headphones" },
  { cls: "fa-solid fa-volume-high", label: "Volume High" },
  { cls: "fa-solid fa-volume-low", label: "Volume Low" },
  { cls: "fa-solid fa-bell", label: "Bell" },
  { cls: "fa-solid fa-bolt", label: "Bolt" },
  { cls: "fa-solid fa-fire", label: "Fire" },
  { cls: "fa-solid fa-heart", label: "Heart" },
  { cls: "fa-solid fa-star", label: "Star" },
  { cls: "fa-solid fa-sun", label: "Sun" },
  { cls: "fa-solid fa-moon", label: "Moon" },
  { cls: "fa-solid fa-cloud", label: "Cloud" },
  { cls: "fa-solid fa-wind", label: "Wind" },
  { cls: "fa-solid fa-water", label: "Water" },
  { cls: "fa-solid fa-snowflake", label: "Snowflake" },
  { cls: "fa-solid fa-feather", label: "Feather" },
  { cls: "fa-solid fa-hand", label: "Hand" },
  { cls: "fa-solid fa-face-smile", label: "Smile" },
  { cls: "fa-solid fa-face-sad-tear", label: "Sad" },
  { cls: "fa-solid fa-circle-exclamation", label: "Exclamation" },
  { cls: "fa-solid fa-triangle-exclamation", label: "Warning" },
  { cls: "fa-solid fa-circle-info", label: "Info" },
  { cls: "fa-solid fa-arrow-up", label: "Arrow Up" },
  { cls: "fa-solid fa-arrow-down", label: "Arrow Down" },
  { cls: "fa-solid fa-arrows-up-down", label: "Arrows Up Down" },
  { cls: "fa-solid fa-rotate", label: "Rotate" },
  { cls: "fa-solid fa-repeat", label: "Repeat" },
  { cls: "fa-solid fa-pause", label: "Pause" },
  { cls: "fa-solid fa-play", label: "Play" },
  { cls: "fa-solid fa-stop", label: "Stop" },
  { cls: "fa-solid fa-forward", label: "Forward" },
  { cls: "fa-solid fa-backward", label: "Backward" },
  { cls: "fa-solid fa-lungs", label: "Lungs" },
  { cls: "fa-solid fa-comment", label: "Comment" },
  { cls: "fa-solid fa-quote-left", label: "Quote" },
  { cls: "fa-solid fa-wand-magic-sparkles", label: "Magic" },
  { cls: "fa-solid fa-explosion", label: "Explosion" },
  { cls: "fa-solid fa-wave-square", label: "Wave" },
  { cls: "fa-solid fa-signal", label: "Signal" },
  { cls: "fa-solid fa-sliders", label: "Sliders" },
  { cls: "fa-solid fa-gauge-high", label: "Gauge High" },
  { cls: "fa-solid fa-gauge", label: "Gauge" },
  { cls: "fa-solid fa-circle-half-stroke", label: "Half Circle" },
  { cls: "fa-solid fa-diamond", label: "Diamond" },
  { cls: "fa-solid fa-hashtag", label: "Hashtag" },
];

export default function TagCreateDialog({ open, onClose, onCreated }: TagCreateDialogProps) {
  const [tag, setTag] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [indexNr, setIndexNr] = useState(1);
  const [iconSearch, setIconSearch] = useState("");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return FA_ICONS;
    const q = iconSearch.toLowerCase();
    return FA_ICONS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.cls.toLowerCase().includes(q)
    );
  }, [iconSearch]);

  if (!open) return null;

  function resetForm() {
    setTag("");
    setLabel("");
    setIcon("");
    setColor("#3b82f6");
    setIndexNr(1);
    setIconSearch("");
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
          {/* Tag-Kürzel */}
          <div>
            <label htmlFor="create-tag" className="block text-sm font-medium text-gray-700">
              Kürzel
            </label>
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

          {/* Label */}
          <div>
            <label htmlFor="create-label" className="block text-sm font-medium text-gray-700">
              Label
            </label>
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

          {/* Icon-Picker */}
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
            <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 p-2">
              {filteredIcons.map((ic) => (
                <button
                  key={ic.cls}
                  type="button"
                  onClick={() => setIcon(ic.cls)}
                  title={ic.label}
                  aria-label={`Icon: ${ic.label}`}
                  className={`flex items-center justify-center rounded p-2 text-lg hover:bg-gray-100 ${
                    icon === ic.cls
                      ? "bg-blue-100 ring-2 ring-blue-500"
                      : ""
                  }`}
                >
                  <i className={ic.cls} style={{ color: color }} aria-hidden="true" />
                </button>
              ))}
              {filteredIcons.length === 0 && (
                <p className="col-span-8 py-2 text-center text-xs text-gray-400">
                  Keine Icons gefunden
                </p>
              )}
            </div>
            {icon && (
              <p className="mt-1 text-xs text-gray-500">
                Gewählt: <i className={icon} style={{ color }} aria-hidden="true" />{" "}
                <code className="rounded bg-gray-100 px-1">{icon}</code>
              </p>
            )}
            {error?.field === "icon" && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
          </div>

          {/* Color-Picker */}
          <div>
            <label htmlFor="create-color" className="block text-sm font-medium text-gray-700">
              Farbe
            </label>
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

          {/* IndexNr */}
          <div>
            <label htmlFor="create-indexnr" className="block text-sm font-medium text-gray-700">
              Sortierung (indexNr)
            </label>
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

          {/* General error */}
          {error && !error.field && <p className="text-sm text-red-600">{error.message}</p>}

          {/* Actions */}
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
