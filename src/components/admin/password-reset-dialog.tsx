"use client";

import { useState } from "react";
import type { UserResponse } from "../../types/auth";

interface PasswordResetDialogProps {
  open: boolean;
  user: UserResponse | null;
  onClose: () => void;
}

export default function PasswordResetDialog({ open, user, onClose }: PasswordResetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  if (!open || !user) return null;

  function handleClose() {
    setError(null);
    setTemporaryPassword(null);
    onClose();
  }

  async function handleReset() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user!.id}/reset-password`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Zurücksetzen");
        return;
      }

      setTemporaryPassword(data.temporaryPassword);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Passwort zurücksetzen</h2>

        {temporaryPassword ? (
          <>
            <p className="mb-2 text-sm text-gray-600">
              Das Passwort für <span className="font-medium">{user.email}</span> wurde zurückgesetzt.
            </p>
            <div className="mb-4 rounded-md bg-green-50 p-3">
              <p className="text-xs text-green-700">Temporäres Passwort:</p>
              <p className="mt-1 font-mono text-sm font-semibold text-green-900 select-all">{temporaryPassword}</p>
            </div>
            <p className="mb-4 text-xs text-gray-500">Bitte teilen Sie dieses Passwort dem Benutzer sicher mit.</p>
            <div className="flex justify-end">
              <button type="button" onClick={handleClose} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Schließen
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Möchten Sie das Passwort für <span className="font-medium">{user.email}</span> zurücksetzen?
              Ein neues temporäres Passwort wird generiert.
            </p>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={handleClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Abbrechen
              </button>
              <button type="button" onClick={handleReset} disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Setze zurück..." : "Zurücksetzen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
