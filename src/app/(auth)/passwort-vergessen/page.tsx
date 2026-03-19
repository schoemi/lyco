"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("E-Mail ist erforderlich");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/passwort-vergessen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setSubmitted(true);
        return;
      }

      const data = await res.json();

      if (res.status === 429) {
        setError(
          data.error ||
            "Zu viele Anfragen. Bitte warte einige Minuten und versuche es erneut."
        );
      } else if (res.status === 400) {
        setError(data.error || "Ungültige E-Mail-Adresse");
      } else {
        setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">
          Passwort vergessen
        </h1>
        <div
          role="status"
          className="mb-4 rounded-md bg-success-50 p-3 text-sm text-success-800"
        >
          Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein
          Rücksetzungslink gesendet. Bitte prüfe dein Postfach.
        </div>
        <Link
          href="/login"
          className="block w-full rounded-md bg-newsong-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">
        Passwort vergessen
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
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            aria-label="E-Mail-Adresse"
            aria-invalid={!!error}
            aria-describedby={error ? "email-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              error ? "border-error-500" : "border-neutral-300"
            }`}
            placeholder="name@beispiel.de"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Wird gesendet…" : "Rücksetzungslink anfordern"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-600">
        <Link
          href="/login"
          className="font-medium text-newsong-600 hover:text-newsong-500"
        >
          Zurück zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
