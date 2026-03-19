"use client";

import { useState, useMemo } from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";

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

/** Iconify icon names for the icon picker (FontAwesome 6 Solid via Iconify) */
const ICON_CHOICES: { icon: string; label: string }[] = [
  { icon: "fa6-solid:microphone", label: "Microphone" },
  { icon: "fa6-solid:music", label: "Music" },
  { icon: "fa6-solid:guitar", label: "Guitar" },
  { icon: "fa6-solid:drum", label: "Drum" },
  { icon: "fa6-solid:headphones", label: "Headphones" },
  { icon: "fa6-solid:volume-high", label: "Volume High" },
  { icon: "fa6-solid:volume-low", label: "Volume Low" },
  { icon: "fa6-solid:bell", label: "Bell" },
  { icon: "fa6-solid:bolt", label: "Bolt" },
  { icon: "fa6-solid:fire", label: "Fire" },
  { icon: "fa6-solid:heart", label: "Heart" },
  { icon: "fa6-solid:star", label: "Star" },
  { icon: "fa6-solid:sun", label: "Sun" },
  { icon: "fa6-solid:moon", label: "Moon" },
  { icon: "fa6-solid:cloud", label: "Cloud" },
  { icon: "fa6-solid:wind", label: "Wind" },
  { icon: "fa6-solid:water", label: "Water" },
  { icon: "fa6-solid:snowflake", label: "Snowflake" },
  { icon: "fa6-solid:feather", label: "Feather" },
  { icon: "fa6-solid:hand", label: "Hand" },
  { icon: "fa6-solid:face-smile", label: "Smile" },
  { icon: "fa6-solid:face-sad-tear", label: "Sad" },
  { icon: "fa6-solid:circle-exclamation", label: "Exclamation" },
  { icon: "fa6-solid:triangle-exclamation", label: "Warning" },
  { icon: "fa6-solid:circle-info", label: "Info" },
  { icon: "fa6-solid:arrow-up", label: "Arrow Up" },
  { icon: "fa6-solid:arrow-down", label: "Arrow Down" },
  { icon: "fa6-solid:arrows-up-down", label: "Arrows Up Down" },
  { icon: "fa6-solid:rotate", label: "Rotate" },
  { icon: "fa6-solid:repeat", label: "Repeat" },
  { icon: "fa6-solid:pause", label: "Pause" },
  { icon: "fa6-solid:play", label: "Play" },
  { icon: "fa6-solid:stop", label: "Stop" },
  { icon: "fa6-solid:forward", label: "Forward" },
  { icon: "fa6-solid:backward", label: "Backward" },
  { icon: "fa6-solid:lungs", label: "Lungs" },
  { icon: "fa6-solid:comment", label: "Comment" },
  { icon: "fa6-solid:quote-left", label: "Quote" },
  { icon: "fa6-solid:wand-magic-sparkles", label: "Magic" },
  { icon: "fa6-solid:explosion", label: "Explosion" },
  { icon: "fa6-solid:wave-square", label: "Wave" },
  { icon: "fa6-solid:signal", label: "Signal" },
  { icon: "fa6-solid:sliders", label: "Sliders" },
  { icon: "fa6-solid:gauge-high", label: "Gauge High" },
  { icon: "fa6-solid:gauge", label: "Gauge" },
  { icon: "fa6-solid:circle-half-stroke", label: "Half Circle" },
  { icon: "fa6-solid:diamond", label: "Diamond" },
  { icon: "fa6-solid:hashtag", label: "Hashtag" },
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
    if (!iconSearch.trim()) return ICON_CHOICES;
    const q = iconSearch.toLowerCase();
    return ICON_CHOICES.filter(
      (i) => i.label.toLowerCase().includes(q) || i.icon.toLowerCase().includes(q)
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
                  key={ic.icon}
                  type="button"
                  onClick={() => setIcon(ic.icon)}
                  title={ic.label}
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
