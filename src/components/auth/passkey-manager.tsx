"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PasskeyInfo {
  id: string;
  name: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Error messages (German)
// ---------------------------------------------------------------------------

const ERROR_MESSAGES = {
  timeout: "Zeitüberschreitung bei der Registrierung. Bitte versuchen Sie es erneut.",
  userCancel: "Registrierung abgebrochen.",
  unsupported: "Ihr Gerät unterstützt keine Passkeys.",
  limitReached: "Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey.",
  invalidName: "Der Passkey-Name muss zwischen 1 und 64 Zeichen lang sein.",
  fetchError: "Fehler beim Laden der Passkeys.",
  deleteError: "Fehler beim Löschen des Passkeys.",
  registerError: "Fehler bei der Passkey-Registrierung.",
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PasskeyManager() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration state
  const [registering, setRegistering] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Check WebAuthn support on mount
  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
  }, []);

  // Fetch passkeys
  const fetchPasskeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/passkey/credentials");
      if (!res.ok) {
        throw new Error(ERROR_MESSAGES.fetchError);
      }
      const data = await res.json();
      setPasskeys(data.passkeys ?? []);
    } catch {
      setError(ERROR_MESSAGES.fetchError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supported) {
      fetchPasskeys();
    }
  }, [supported, fetchPasskeys]);

  // Validate passkey name (1–64 chars)
  function validateName(name: string): boolean {
    const trimmed = name.trim();
    return trimmed.length >= 1 && trimmed.length <= 64;
  }

  // Handle registration
  async function handleRegister() {
    setError(null);
    setNameError(null);

    if (!validateName(passkeyName)) {
      setNameError(ERROR_MESSAGES.invalidName);
      return;
    }

    setRegistering(true);

    try {
      // 1. Get registration options from server
      const optionsRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        if (data.error?.includes("10 Passkeys")) {
          setError(ERROR_MESSAGES.limitReached);
        } else {
          setError(data.error ?? ERROR_MESSAGES.registerError);
        }
        return;
      }

      const data = await optionsRes.json();
      const options: PublicKeyCredentialCreationOptionsJSON = data.options ?? data;

      // 2. Trigger browser WebAuthn prompt
      const credential = await startRegistration(options);

      // 3. Send result to server for verification
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          name: passkeyName.trim(),
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setError(data.error ?? ERROR_MESSAGES.registerError);
        return;
      }

      // Success — reset form and refresh list
      setPasskeyName("");
      setShowNameInput(false);
      await fetchPasskeys();
    } catch (err: unknown) {
      // Handle WebAuthn-specific errors
      const errorName = err instanceof Error ? err.name : "";
      const errorMessage = err instanceof Error ? err.message : "";

      if (errorName === "NotAllowedError" || errorMessage.includes("cancelled") || errorMessage.includes("canceled")) {
        setError(ERROR_MESSAGES.userCancel);
      } else if (errorName === "AbortError" || errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        setError(ERROR_MESSAGES.timeout);
      } else if (errorName === "NotSupportedError" || errorMessage.includes("not supported")) {
        setError(ERROR_MESSAGES.unsupported);
      } else {
        setError(ERROR_MESSAGES.registerError);
      }
    } finally {
      setRegistering(false);
    }
  }

  // Handle delete
  async function handleDelete(passkeyId: string) {
    setError(null);
    setDeletingId(passkeyId);

    try {
      const res = await fetch(`/api/auth/passkey/credentials/${passkeyId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? ERROR_MESSAGES.deleteError);
        return;
      }

      setConfirmDeleteId(null);
      await fetchPasskeys();
    } catch {
      setError(ERROR_MESSAGES.deleteError);
    } finally {
      setDeletingId(null);
    }
  }

  // Format date for display
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Don't render if WebAuthn is not supported or still checking
  if (supported === null) {
    return null;
  }

  if (!supported) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Passkeys</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Passkeys ermöglichen eine sichere Anmeldung ohne Passwort über biometrische Daten oder einen Sicherheitsschlüssel.
      </p>

      {/* Error message */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Passkey list */}
      {loading ? (
        <div className="text-sm text-neutral-500">Passkeys werden geladen…</div>
      ) : passkeys.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-500">
          Noch keine Passkeys registriert.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-neutral-100" aria-label="Registrierte Passkeys">
          {passkeys.map((pk) => (
            <li key={pk.id} className="flex items-center justify-between py-3">
              <div>
                <span className="text-sm font-medium text-neutral-900">{pk.name}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  Erstellt am {formatDate(pk.createdAt)}
                </span>
              </div>
              <div>
                {confirmDeleteId === pk.id ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-neutral-600">Wirklich löschen?</span>
                    <button
                      onClick={() => handleDelete(pk.id)}
                      disabled={deletingId === pk.id}
                      className="rounded px-2 py-1 text-xs font-medium text-white bg-error-600 hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Passkey "${pk.name}" endgültig löschen`}
                    >
                      {deletingId === pk.id ? "…" : "Ja"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded px-2 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200"
                    >
                      Nein
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(pk.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-error-700 hover:bg-error-50"
                    aria-label={`Passkey "${pk.name}" löschen`}
                  >
                    Löschen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Register new passkey */}
      {showNameInput ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="passkeyName" className="block text-sm font-medium text-neutral-700 mb-1">
              Name für den neuen Passkey
            </label>
            <input
              id="passkeyName"
              type="text"
              value={passkeyName}
              onChange={(e) => {
                setPasskeyName(e.target.value);
                setNameError(null);
              }}
              maxLength={64}
              placeholder="z.B. MacBook Touch ID, iPhone"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-newsong-500 focus:outline-none focus:ring-1 focus:ring-newsong-500"
              aria-describedby={nameError ? "passkeyNameError" : undefined}
              aria-invalid={nameError ? "true" : undefined}
            />
            {nameError && (
              <p id="passkeyNameError" className="mt-1 text-sm text-error-600">
                {nameError}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRegister}
              disabled={registering}
              className="rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
            >
              {registering ? "Registrierung läuft…" : "Passkey registrieren"}
            </button>
            <button
              onClick={() => {
                setShowNameInput(false);
                setPasskeyName("");
                setNameError(null);
                setError(null);
              }}
              disabled={registering}
              className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNameInput(true)}
          className="rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
        >
          Neuen Passkey registrieren
        </button>
      )}
    </div>
  );
}
