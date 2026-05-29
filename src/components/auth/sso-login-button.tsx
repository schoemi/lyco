"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SsoLoginButton() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check SSO availability on mount
  useEffect(() => {
    let cancelled = false;

    async function checkSsoStatus() {
      try {
        const res = await fetch("/api/auth/sso/status");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setConfigured(data.configured === true);
          }
        } else {
          if (!cancelled) {
            setConfigured(false);
          }
        }
      } catch {
        if (!cancelled) {
          setConfigured(false);
        }
      }
    }

    checkSsoStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSsoLogin = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      await signIn("authentik", { callbackUrl: "/" });
    } catch {
      setError("SSO-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
      setLoading(false);
    }
  }, []);

  // Don't render if SSO is not configured or still checking
  if (configured === null || !configured) {
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
        onClick={handleSsoLogin}
        disabled={loading}
        className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Mit SSO anmelden"
      >
        {loading ? "Weiterleitung…" : "Mit SSO anmelden"}
      </button>
    </div>
  );
}
