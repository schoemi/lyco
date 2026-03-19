"use client";

import { useState } from "react";

interface FreigabeDialogProps {
  open: boolean;
  onClose: () => void;
  type: "song" | "set";
  itemId: string;
  onFreigabeCreated?: () => void;
}

export default function FreigabeDialog({
  open,
  onClose,
  type,
  itemId,
  onFreigabeCreated,
}: FreigabeDialogProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function resetForm() {
    setEmail("");
    setError(null);
    setSuccess(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        type === "song" ? "/api/freigaben/songs" : "/api/freigaben/sets";
      const body =
        type === "song"
          ? { songId: itemId, empfaengerEmail: trimmed }
          : { setId: itemId, empfaengerEmail: trimmed };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 201) {
        setSuccess(
          type === "song"
            ? "Song wurde erfolgreich freigegeben"
            : "Set wurde erfolgreich freigegeben"
        );
        setEmail("");
        onFreigabeCreated?.();
        return;
      }

      const data = await res.json();
      setError(data.error || "Ein Fehler ist aufgetreten");
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  const label = type === "song" ? "Song" : "Set";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {label} teilen
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="freigabe-email"
              className="block text-sm font-medium text-gray-700"
            >
              E-Mail-Adresse des Empfängers
            </label>
            <input
              id="freigabe-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder="nutzer@beispiel.de"
              aria-label="E-Mail-Adresse des Empfängers"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600" role="status">
              {success}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Schließen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Teile..." : "Teilen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
