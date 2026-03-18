"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function clearErrors() {
    setEmailError("");
    setNameError("");
    setPasswordError("");
    setGeneralError("");
  }

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    if (!email.trim()) {
      setEmailError("E-Mail ist erforderlich");
      hasError = true;
    } else if (!validateEmail(email.trim())) {
      setEmailError("Ungültige E-Mail-Adresse");
      hasError = true;
    }

    if (!name.trim()) {
      setNameError("Name ist erforderlich");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Passwort ist erforderlich");
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError("Passwort muss mindestens 8 Zeichen lang sein");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          password,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const data = await res.json();

      if (res.status === 409) {
        setEmailError(data.error || "E-Mail bereits vergeben");
      } else if (res.status === 400 && data.field === "email") {
        setEmailError(data.error || "Ungültige E-Mail-Adresse");
      } else if (res.status === 400 && data.field === "password") {
        setPasswordError(data.error || "Ungültiges Passwort");
      } else {
        setGeneralError(data.error || "Registrierung fehlgeschlagen");
      }
    } catch {
      setGeneralError("Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">
          Registrierung erfolgreich
        </h1>
        <p className="mb-4 text-center text-sm text-neutral-600">
          Ihr Konto wurde erstellt. Sie können sich jetzt anmelden.
        </p>
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
        Registrieren
      </h1>

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
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            aria-label="Name"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "name-error" : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              nameError ? "border-error-500" : "border-neutral-300"
            }`}
            placeholder="Ihr Name"
          />
          {nameError && (
            <p id="name-error" role="alert" className="mt-1 text-sm text-error-600">
              {nameError}
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
            placeholder="Mindestens 8 Zeichen"
          />
          {passwordError && (
            <p id="password-error" role="alert" className="mt-1 text-sm text-error-600">
              {passwordError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Registrieren…" : "Registrieren"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-600">
        Bereits ein Konto?{" "}
        <Link
          href="/login"
          className="font-medium text-newsong-600 hover:text-newsong-500"
        >
          Anmelden
        </Link>
      </p>
    </div>
  );
}
