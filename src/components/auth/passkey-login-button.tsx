"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/types";

// ---------------------------------------------------------------------------
// Error messages (German)
// ---------------------------------------------------------------------------

const ERROR_MESSAGES = {
  expired: "Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut.",
  invalidAssertion: "Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
  rateLimited: "Zu viele fehlgeschlagene Versuche. Bitte warten Sie {minutes} Minuten.",
  userCancelled: "Anmeldung abgebrochen.",
  compromised: "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey.",
  generic: "Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PasskeyLoginButton() {
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check WebAuthn support on mount
  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
  }, []);

  const handlePasskeyLogin = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Request authentication options from server
      const optionsRes = await fetch("/api/auth/passkey/authenticate/options", {
        method: "POST",
      });

      if (!optionsRes.ok) {
        if (optionsRes.status === 429) {
          const data = await optionsRes.json();
          const minutes = data.retryAfterMinutes ?? 15;
          setError(ERROR_MESSAGES.rateLimited.replace("{minutes}", String(minutes)));
          return;
        }
        setError(ERROR_MESSAGES.generic);
        return;
      }

      const data = await optionsRes.json();
      const options: PublicKeyCredentialRequestOptionsJSON = data.options ?? data;

      // 2. Trigger browser WebAuthn prompt
      const assertion = await startAuthentication(options);

      // 3. Submit assertion to verify endpoint
      const verifyRes = await fetch("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();

        if (verifyRes.status === 429) {
          const minutes = data.retryAfterMinutes ?? 15;
          setError(ERROR_MESSAGES.rateLimited.replace("{minutes}", String(minutes)));
          return;
        }

        // Determine error type from server response
        const errorMsg = data.error ?? "";

        if (errorMsg.includes("abgelaufen")) {
          setError(ERROR_MESSAGES.expired);
        } else if (errorMsg.includes("Sicherheitsproblem") || errorMsg.includes("deaktiviert")) {
          setError(ERROR_MESSAGES.compromised);
        } else {
          setError(ERROR_MESSAGES.invalidAssertion);
        }
        return;
      }

      // 4. Success — redirect to home page
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      // Handle WebAuthn-specific errors (user cancelled, timeout, etc.)
      const errorName = err instanceof Error ? err.name : "";
      const errorMessage = err instanceof Error ? err.message : "";

      console.error("[PasskeyLogin] Authentication error:", errorName, errorMessage, err);

      if (
        errorName === "NotAllowedError" ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled")
      ) {
        // User cancelled — show cancellation message
        setError(ERROR_MESSAGES.userCancelled);
      } else if (errorName === "AbortError" || errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        setError(ERROR_MESSAGES.expired);
      } else {
        setError(ERROR_MESSAGES.generic);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Don't render if WebAuthn is not supported or still checking
  if (supported === null || !supported) {
    return null;
  }

  return (
    <div className="w-full">
      {error && (
        <div
          className="mb-3 rounded-md bg-error-50 p-3 text-sm text-error-700"
          role="alert"
        >
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Mit Passkey anmelden"
      >
        {loading ? "Authentifizierung läuft…" : "Mit Passkey anmelden"}
      </button>
    </div>
  );
}
