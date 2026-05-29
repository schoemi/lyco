"use client";

import { useEffect, useState } from "react";

interface SsoLinkStatus {
  linked: boolean;
  provider?: string;
}

export function SsoStatus() {
  const [status, setStatus] = useState<SsoLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLinkStatus() {
      try {
        const res = await fetch("/api/auth/sso/link-status");
        if (!res.ok) {
          throw new Error("Fehler beim Laden des SSO-Status");
        }
        const data: SsoLinkStatus = await res.json();
        setStatus(data);
      } catch {
        setError("Fehler beim Laden des SSO-Status");
      } finally {
        setLoading(false);
      }
    }
    fetchLinkStatus();
  }, []);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Single Sign-On (SSO)</h2>

      {loading && (
        <p className="text-sm text-neutral-500">SSO-Status wird geladen…</p>
      )}

      {error && (
        <div
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {status && !error && (
        <div className="text-sm text-neutral-700">
          {status.linked ? (
            <p>
              Ihr Konto ist mit SSO verknüpft
              {status.provider && (
                <span className="ml-1 font-medium text-neutral-900">
                  (Provider: {status.provider})
                </span>
              )}
            </p>
          ) : (
            <p>Ihr Konto ist nicht mit SSO verknüpft</p>
          )}
        </div>
      )}
    </div>
  );
}
