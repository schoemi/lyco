"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  const expired = searchParams.get("expired") === "true";

  function clearErrors() {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    if (!email.trim()) {
      setEmailError("E-Mail ist erforderlich");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Passwort ist erforderlich");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setGeneralError("Anmeldedaten ungültig");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setGeneralError("Anmeldedaten ungültig");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">
        Anmelden
      </h1>

      {expired && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-info-50 p-3 text-sm text-info-800"
        >
          Sitzung abgelaufen. Bitte melden Sie sich erneut an.
        </div>
      )}

      {generalError && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-error-50 p-3 text-sm text-error-700"
        >
          {generalError}
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
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              emailError ? "border-error-500" : "border-neutral-300"
            }`}
            placeholder="name@beispiel.de"
          />
          {emailError && (
            <p id="email-error" role="alert" className="mt-1 text-sm text-error-600">
              {emailError}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Passwort
          </label>
          <input
            id="password"
            type="password"
            aria-label="Passwort"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "password-error" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              passwordError ? "border-error-500" : "border-neutral-300"
            }`}
            placeholder="Passwort eingeben"
          />
          {passwordError && (
            <p id="password-error" role="alert" className="mt-1 text-sm text-error-600">
              {passwordError}
            </p>
          )}
          <div className="mt-1 text-right">
            <Link
              href="/passwort-vergessen"
              className="text-xs text-newsong-600 hover:text-newsong-500"
            >
              Passwort vergessen?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Anmelden…" : "Anmelden"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-600">
        Noch kein Konto?{" "}
        <Link
          href="/register"
          className="font-medium text-newsong-600 hover:text-newsong-500"
        >
          Registrieren
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
