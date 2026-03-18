"use client";

/**
 * ThemeListPage – Admin-Übersicht aller Themes mit CRUD-Aktionen.
 *
 * Anforderungen: 4.1, 4.2, 4.3, 3.1, 3.2, 8.1
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ThemeImportDialog from "@/components/admin/theme-import-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeRecord {
  id: string;
  name: string;
  lightConfig: string;
  darkConfig: string;
  isDefault: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the first N hex color values from a ThemeConfig JSON string. */
function extractPaletteColors(configJson: string, count: number): string[] {
  try {
    const config = JSON.parse(configJson);
    if (!config?.colors) return [];
    const colors: string[] = [];
    for (const value of Object.values(config.colors)) {
      if (typeof value === "string" && value.startsWith("#") && colors.length < count) {
        colors.push(value);
      }
    }
    return colors;
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ColorSwatches({ colors }: { colors: string[] }) {
  if (colors.length === 0) return null;
  return (
    <div className="flex gap-1">
      {colors.map((c, i) => (
        <span
          key={i}
          className="inline-block h-5 w-5 rounded border border-gray-300"
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <p className="mb-4 text-sm text-gray-800">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

function NamePromptDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name darf nicht leer sein.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Name darf maximal 100 Zeichen lang sein.");
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Neues Theme erstellen</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Theme-Name"
          maxLength={100}
          className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          autoFocus
        />
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Erstellen
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ThemeListPage() {
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [deleteTarget, setDeleteTarget] = useState<ThemeRecord | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // ---- Fetch themes ----
  const fetchThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/themes");
      if (!res.ok) throw new Error("Fehler beim Laden der Themes");
      const data: ThemeRecord[] = await res.json();
      setThemes(data);
      setError(null);
    } catch {
      setError("Themes konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  // ---- Actions ----

  async function handleCreate(name: string) {
    setShowCreateDialog(false);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Erstellen");
      }
      setSuccess(`Theme „${name}" wurde erstellt.`);
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/settings/themes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Löschen");
      }
      setSuccess(`Theme „${name}" wurde gelöscht.`);
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  }

  async function handleSetDefault(theme: ThemeRecord) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/settings/themes/${theme.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Setzen als Standard");
      }
      setSuccess(`„${theme.name}" ist jetzt das Standard-Theme.`);
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Setzen als Standard");
    }
  }

  function handleExport(theme: ThemeRecord) {
    // Trigger download via the export endpoint
    const link = document.createElement("a");
    link.href = `/api/settings/themes/${theme.id}/export`;
    link.download = `${theme.name.replace(/\s+/g, "_")}.theme.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ---- Render ----

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Theming</h1>
        <p className="text-sm text-gray-500">Lade Themes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Theming</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Importieren
          </button>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Neues Theme
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* Theme list */}
      {themes.length === 0 ? (
        <p className="text-sm text-gray-500">Keine Themes vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {themes.map((theme) => {
            const lightColors = extractPaletteColors(theme.lightConfig, 6);
            const darkColors = extractPaletteColors(theme.darkConfig, 6);

            return (
              <div
                key={theme.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {theme.name}
                    </span>
                    {theme.isDefault && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Standard
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Erstellt am {formatDate(theme.createdAt)}
                  </p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-10">Light</span>
                      <ColorSwatches colors={lightColors} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-10">Dark</span>
                      <ColorSwatches colors={darkColors} />
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/theming/${theme.id}`}
                    className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Bearbeiten
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleExport(theme)}
                    className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Exportieren
                  </button>
                  {!theme.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(theme)}
                      className="rounded border border-purple-300 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
                    >
                      Als Standard
                    </button>
                  )}
                  {!theme.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(theme)}
                      className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Möchten Sie das Theme „${deleteTarget.name}" wirklich löschen? Benutzer, die dieses Theme verwenden, werden auf das Standard-Theme zurückgesetzt.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {showCreateDialog && (
        <NamePromptDialog
          onSubmit={handleCreate}
          onCancel={() => setShowCreateDialog(false)}
        />
      )}
      {showImportDialog && (
        <ThemeImportDialog
          onSuccess={async () => {
            setShowImportDialog(false);
            setSuccess("Theme wurde erfolgreich importiert.");
            await fetchThemes();
          }}
          onCancel={() => setShowImportDialog(false)}
        />
      )}
    </div>
  );
}
