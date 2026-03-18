"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function SetupPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const res = await fetch("/api/setup/status");
        const data = await res.json();
        if (!data.required) {
          router.replace("/login");
          return;
        }
      } catch {
        // If status check fails, show the form anyway
      } finally {
        setChecking(false);
      }
    }
    checkSetupStatus();
  }, [router]);

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
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          password,
        }),
        redirect: "manual",
      });

      if (res.status === 201) {
        router.replace("/login");
        return;
      }

      if (res.type === "opaqueredirect" || res.status === 0) {
        // Setup already completed — redirect returned by server
        router.replace("/login");
        return;
      }

      const data = await res.json();

      if (res.status === 400) {
        if (data.error?.includes("E-Mail")) {
          setEmailError(data.error);
        } else if (data.error?.includes("Passwort")) {
          setPasswordError(data.error);
        } else {
          setGeneralError(data.error || "Ungültige Eingabe");
        }
      } else {
        setGeneralError(data.error || "Setup fehlgeschlagen");
      }
    } catch {
      setGeneralError("Setup fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="text-center text-sm text-neutral-500">
        Lade…
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-bold text-neutral-900">
        Ersteinrichtung
      </h1>
      <p className="mb-6 text-center text-sm text-neutral-600">
        Erstellen Sie den ersten Administrator-Account.
      </p>

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
            htmlFor="setup-email"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            E-Mail
          </label>
          <input
            id="setup-email"
            type="email"
            aria-label="E-Mail-Adresse"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "setup-email-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              emailError ? "border-error-500" : "border-neutral-300"
            }`}
            placeholder="admin@beispiel.de"
          />
          {emailError && (
            <p id="setup-email-error" role="alert" className="mt-1 text-sm text-error-600">
              {emailError}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="setup-name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Name
          </label>
          <input
            id="setup-name"
            type="text"
            aria-label="Name"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "setup-name-error" : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              nameError ? "border-error-500" : "border-neutral-300"
            }`}
            placeholder="Ihr Name"
          />
          {nameError && (
            <p id="setup-name-error" role="alert" className="mt-1 text-sm text-error-600">
              {nameError}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="setup-password"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Passwort
          </label>
          <input
            id="setup-password"
            type="password"
            aria-label="Passwort"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "setup-password-error" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
              passwordError ? "border-error-500" : "border-neutral-300"
            }`}
            placeholder="Mindestens 8 Zeichen"
          />
          {passwordError && (
            <p id="setup-password-error" role="alert" className="mt-1 text-sm text-error-600">
              {passwordError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Erstelle Admin…" : "Admin-Account erstellen"}
        </button>
      </form>
    </div>
  );
}
