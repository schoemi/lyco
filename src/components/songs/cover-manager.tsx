"use client";

import { useState } from "react";

interface CoverManagerProps {
  songId: string;
  coverUrl: string | null;
  onCoverChanged: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

export default function CoverManager({
  songId,
  coverUrl,
  onCoverChanged,
}: CoverManagerProps) {
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!urlValue.trim()) {
      setError("Bitte eine URL eingeben");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl: urlValue.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Fehler beim Speichern");
        return;
      }

      setUrlValue("");
      onCoverChanged();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Bitte eine Datei auswählen");
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Nur JPEG, PNG und WebP Dateien sind erlaubt");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Die Datei darf maximal 5 MB groß sein");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/songs/${songId}/cover/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Fehler beim Hochladen");
        return;
      }

      setFile(null);
      onCoverChanged();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl: null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Fehler beim Entfernen");
        return;
      }

      onCoverChanged();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Cover preview */}
      {coverUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700">Aktuelles Cover</p>
          <div className="relative h-[200px] w-[200px] overflow-hidden rounded-lg border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt="Cover-Bild"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Input form */}
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        {/* Toggle: URL vs File Upload */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setUseFileUpload(false); setError(null); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !useFileUpload
                ? "bg-newsong-600 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            URL eingeben
          </button>
          <button
            type="button"
            onClick={() => { setUseFileUpload(true); setError(null); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              useFileUpload
                ? "bg-newsong-600 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Datei hochladen
          </button>
        </div>

        {useFileUpload ? (
          <form onSubmit={handleFileUpload} className="space-y-3" noValidate>
            <div>
              <label
                htmlFor="cover-file"
                className="block text-sm font-medium text-neutral-700"
              >
                Bild-Datei (JPEG, PNG, WebP, max. 5 MB)
              </label>
              <input
                id="cover-file"
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-newsong-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-newsong-700 hover:file:bg-newsong-100"
              />
              {file && (
                <p className="mt-1 text-xs text-neutral-500">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>
            {error && (
              <p className="text-sm text-error-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50"
              >
                {loading ? "Hochladen..." : "Hochladen"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveUrl} className="space-y-3" noValidate>
            <div>
              <label
                htmlFor="cover-url"
                className="block text-sm font-medium text-neutral-700"
              >
                Cover-URL
              </label>
              <input
                id="cover-url"
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
              />
            </div>
            {error && (
              <p className="text-sm text-error-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50"
              >
                {loading ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </form>
        )}

        {/* Remove button – only when cover is set */}
        {coverUrl && (
          <div className="border-t border-neutral-200 pt-3">
            <button
              type="button"
              onClick={handleRemove}
              disabled={loading}
              className="rounded-md border border-error-300 px-3 py-1.5 text-sm font-medium text-error-600 hover:bg-error-50 disabled:opacity-50"
            >
              {loading ? "Entfernen..." : "Entfernen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
