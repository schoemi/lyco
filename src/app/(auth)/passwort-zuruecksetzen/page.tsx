"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PasswortZuruecksetzenForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/passwort-zuruecksetzen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const data = await res.json();

      if (res.status === 429) {
        setError(
          data.error ||
            "Zu viele Versuche. Bitte warte einige Minuten."
        );
      } else {
        setError(
          data.error || "Ein Fehler ist aufgetreten. Bitte versuche es später erneut."
        );
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">
          Passwort zurücksetzen
        </h1>
        <div
          role="alert"
          className="mb-4 rounded-md bg-error-50 p-3 text-sm text-error-700"
        >
          Ungültiger oder abgelaufener Rücksetzungslink.
        </div>
        <Link
          href="/passwort-vergessen"
          className="block w-full rounded-md bg-newsong-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
        >
          Neuen Link anfordern
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">
          Passwort zurücksetzen
        </h1>
        <div
          role="status"
          className="mb-4 rounded-md bg-success-50 p-3 text-sm text-success-800"
        >
          Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt
          anmelden.
        </div>
        <Link
          href="/login"
          className="block w-full rounded-md bg-newsong-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
        >
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">
        Passwort zurücksetzen
      </h1>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-error-50 p-3 text-sm text-error-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form space-y-4" noValidate>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Neues Passwort
          </label>
          <input
            id="password"
            type="password"
            aria-label="Neues Passwort"
            aria-invalid={!!error}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              error ? "border-error-500" : "border-neutral-300"
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Neues Passwort bestätigen
          </label>
          <input
            id="confirmPassword"
            type="password"
            aria-label="Neues Passwort bestätigen"
            aria-invalid={!!error}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              error ? "border-error-500" : "border-neutral-300"
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Wird zurückgesetzt…" : "Passwort zurücksetzen"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-600">
        <Link
          href="/login"
          className="font-medium text-newsong-600 hover:text-newsong-500"
        >
          Zur Anmeldung
        </Link>
      </p>
    </div>
  );
}

export default function PasswortZuruecksetzenPage() {
  return (
    <Suspense>
      <PasswortZuruecksetzenForm />
    </Suspense>
  );
}
