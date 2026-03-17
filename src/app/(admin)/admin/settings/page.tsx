"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSetting() {
      try {
        const res = await fetch("/api/settings/require-approval");
        if (!res.ok) throw new Error("Fehler beim Laden");
        const data = await res.json();
        setRequireApproval(data.value);
        setError(null);
      } catch {
        setError("Einstellung konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }
    fetchSetting();
  }, []);

  async function handleToggle() {
    const newValue = !requireApproval;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/require-approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newValue }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      const data = await res.json();
      setRequireApproval(data.value);
      setError(null);
    } catch {
      setError("Einstellung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Einstellungen</h1>

      {loading && <p className="text-sm text-gray-500">Lade Einstellungen...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Bestätigungspflicht für neue Benutzer
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Wenn aktiviert, müssen neue Benutzer nach der Registrierung von einem Administrator bestätigt werden.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={requireApproval}
              disabled={saving}
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                requireApproval ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  requireApproval ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
