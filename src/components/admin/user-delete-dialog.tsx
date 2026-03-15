"use client";

import { useState } from "react";
import type { UserResponse } from "../../types/auth";

interface UserDeleteDialogProps {
  open: boolean;
  user: UserResponse | null;
  currentUserId: string | undefined;
  onClose: () => void;
  onDeleted: (userId: string) => void;
}

export default function UserDeleteDialog({ open, user, currentUserId, onClose, onDeleted }: UserDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !user) return null;

  const isSelf = user.id === currentUserId;

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user!.id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Löschen");
        return;
      }

      onDeleted(user!.id);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Benutzer löschen</h2>
        <p className="mb-1 text-sm text-gray-600">
          Möchten Sie den Benutzer <span className="font-medium">{user.email}</span> wirklich löschen?
        </p>
        <p className="mb-4 text-sm text-red-600">Diese Aktion kann nicht rückgängig gemacht werden.</p>
        {isSelf && (
          <p className="mb-4 rounded-md bg-yellow-50 p-2 text-sm text-yellow-800">
            Sie können Ihren eigenen Account nicht löschen.
          </p>
        )}
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || isSelf}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Lösche..." : "Löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}
