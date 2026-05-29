"use client";

import { useEffect, useState } from "react";

export default function SsoAdminSettings() {
  const [autoCreate, setAutoCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSetting() {
      try {
        const res = await fetch("/api/settings/sso");
        if (res.status === 403 || res.status === 401) {
          setError("Zugriff verweigert.");
          return;
        }
        if (!res.ok) throw new Error("Fehler beim Laden");
        const data = await res.json();
        setAutoCreate(data.autoCreateAccounts);
        setError(null);
      } catch {
        setError("SSO-Einstellung konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }
    fetchSetting();
  }, []);

  async function handleToggle() {
    const newValue = !autoCreate;
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/sso", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCreateAccounts: newValue }),
      });
      if (res.status === 403 || res.status === 401) {
        setError("Zugriff verweigert.");
        return;
      }
      if (!res.ok) throw new Error("Fehler beim Speichern");
      const data = await res.json();
      setAutoCreate(data.autoCreateAccounts);
      setSuccess("Einstellung gespeichert.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("SSO-Einstellung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Lade SSO-Einstellungen...</p>
      </div>
    );
  }

  if (error && !autoCreate && loading === false) {
    // If we got an access denied error, don't render the toggle
    if (error === "Zugriff verweigert.") {
      return null;
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Automatische Kontoerstellung bei SSO
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Wenn aktiviert, wird bei der SSO-Anmeldung automatisch ein neues
            Konto erstellt, falls noch keines mit der E-Mail-Adresse existiert.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoCreate}
          disabled={saving}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            autoCreate ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              autoCreate ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
    </div>
  );
}
