"use client";

import { useEffect, useState } from "react";

interface LinkedSong {
  id: string;
  titel: string;
  kuenstler: string | null;
}

interface FileEntry {
  filename: string;
  type: "audio" | "cover";
  sizeBytes: number;
  createdAt: string;
  linked: boolean;
  linkedSongs: LinkedSong[];
}

interface Summary {
  total: number;
  linked: number;
  unlinked: number;
  totalSizeBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FilterType = "all" | "audio" | "cover";
type FilterLink = "all" | "linked" | "unlinked";

export default function AdminFilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterLink, setFilterLink] = useState<FilterLink>("all");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function fetchFiles() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/files");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setFiles(data.files);
      setSummary(data.summary);
      setError(null);
    } catch {
      setError("Dateien konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  async function handleDelete(filename: string, type: "audio" | "cover") {
    if (!confirm(`Datei "${filename}" wirklich löschen?`)) return;
    setDeleteLoading(filename);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/files/${encodeURIComponent(filename)}?type=${type}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Fehler beim Löschen");
        return;
      }
      setFiles((prev) => prev.filter((f) => f.filename !== filename || f.type !== type));
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              total: prev.total - 1,
              unlinked: prev.unlinked - 1,
            }
          : prev
      );
    } catch {
      setDeleteError("Netzwerkfehler");
    } finally {
      setDeleteLoading(null);
    }
  }

  const filtered = files.filter((f) => {
    if (filterType !== "all" && f.type !== filterType) return false;
    if (filterLink === "linked" && !f.linked) return false;
    if (filterLink === "unlinked" && f.linked) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dateiverwaltung</h1>
        <p className="mt-1 text-sm text-gray-500">
          Übersicht aller hochgeladenen Dateien und deren Verknüpfung mit Songs.
        </p>
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Gesamt</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Verknüpft</p>
            <p className="text-2xl font-semibold text-green-600">{summary.linked}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Verwaist</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.unlinked}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Speicher</p>
            <p className="text-2xl font-semibold text-gray-900">{formatBytes(summary.totalSizeBytes)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type" className="text-sm text-gray-600">Typ:</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="all">Alle</option>
            <option value="audio">Audio</option>
            <option value="cover">Cover</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-link" className="text-sm text-gray-600">Status:</label>
          <select
            id="filter-link"
            value={filterLink}
            onChange={(e) => setFilterLink(e.target.value as FilterLink)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="all">Alle</option>
            <option value="linked">Verknüpft</option>
            <option value="unlinked">Verwaist</option>
          </select>
        </div>
        <button
          onClick={fetchFiles}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
        >
          Aktualisieren
        </button>
      </div>

      {deleteError && (
        <p className="mb-4 text-sm text-red-600">{deleteError}</p>
      )}

      {loading && <p className="text-sm text-gray-500">Lade Dateien...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dateiname</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Größe</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Erstellt</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Verknüpfte Songs</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((file) => (
                <tr key={`${file.type}-${file.filename}`} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-mono">
                    {file.filename}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      file.type === "audio"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}>
                      {file.type === "audio" ? "Audio" : "Cover"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatBytes(file.sizeBytes)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {new Date(file.createdAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {file.linked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Verknüpft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Verwaist
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {file.linkedSongs.length > 0 ? (
                      <ul className="space-y-0.5">
                        {file.linkedSongs.map((song) => (
                          <li key={song.id}>
                            <a
                              href={`/songs/${song.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {song.titel}
                              {song.kuenstler ? ` – ${song.kuenstler}` : ""}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    {!file.linked && (
                      <button
                        onClick={() => handleDelete(file.filename, file.type)}
                        disabled={deleteLoading === file.filename}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {deleteLoading === file.filename ? "Lösche..." : "Löschen"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                    Keine Dateien gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
