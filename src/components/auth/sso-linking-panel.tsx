"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SsoLinkStatus {
  linked: boolean;
  provider?: string; // "Authentik" (capitalized by endpoint)
  ssoConfigured: boolean;
}

type PanelState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "linked"; provider: string }
  | { type: "unlinked" }
  | { type: "sso-not-configured" };

type UrlFeedback =
  | { type: "success"; key: "sso-linked" }
  | {
      type: "error";
      key:
        | "sso-link-failed"
        | "sso-link-timeout"
        | "sso-link-denied"
        | "sso-link-invalid-state"
        | "sso-already-linked";
    }
  | null;

// ---------------------------------------------------------------------------
// Feedback messages (German)
// ---------------------------------------------------------------------------

const FEEDBACK_MESSAGES: Record<string, { text: string; isError: boolean }> = {
  "sso-linked": {
    text: "SSO-Verknüpfung erfolgreich eingerichtet",
    isError: false,
  },
  "sso-link-failed": { text: "SSO-Verknüpfung fehlgeschlagen", isError: true },
  "sso-link-timeout": {
    text: "SSO-Verknüpfung fehlgeschlagen",
    isError: true,
  },
  "sso-link-denied": {
    text: "SSO-Anmeldung wurde abgebrochen",
    isError: true,
  },
  "sso-link-invalid-state": {
    text: "Ungültiger Verknüpfungsstatus",
    isError: true,
  },
  "sso-already-linked": {
    text: "Dieser SSO-Account ist bereits mit einem anderen Konto verknüpft",
    isError: true,
  },
};

// ---------------------------------------------------------------------------
// Helper: parse URL feedback params
// ---------------------------------------------------------------------------

function parseUrlFeedback(
  searchParams: ReturnType<typeof useSearchParams>
): UrlFeedback {
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  if (success === "sso-linked") {
    return { type: "success", key: "sso-linked" };
  }

  const validErrorKeys = [
    "sso-link-failed",
    "sso-link-timeout",
    "sso-link-denied",
    "sso-link-invalid-state",
    "sso-already-linked",
  ] as const;

  if (error && (validErrorKeys as readonly string[]).includes(error)) {
    return {
      type: "error",
      key: error as (typeof validErrorKeys)[number],
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SsoLinkingPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [panelState, setPanelState] = useState<PanelState>({ type: "loading" });
  const [feedback, setFeedback] = useState<UrlFeedback>(null);
  const [unlinking, setUnlinking] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch link status
  // ---------------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    setPanelState({ type: "loading" });
    try {
      const res = await fetch("/api/auth/sso/link-status");
      if (!res.ok) {
        throw new Error("Fehler beim Laden des SSO-Status");
      }
      const data: SsoLinkStatus = await res.json();

      if (data.linked && data.provider) {
        setPanelState({ type: "linked", provider: data.provider });
      } else if (!data.linked && data.ssoConfigured) {
        setPanelState({ type: "unlinked" });
      } else if (!data.ssoConfigured) {
        setPanelState({ type: "sso-not-configured" });
      } else {
        // Fallback: not linked, no sso configured
        setPanelState({ type: "sso-not-configured" });
      }
    } catch {
      setPanelState({
        type: "error",
        message: "Fehler beim Laden des SSO-Status",
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // On mount: parse URL params, then fetch status
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const urlFeedback = parseUrlFeedback(searchParams);
    setFeedback(urlFeedback);

    // Clean up URL params if feedback was found
    if (urlFeedback !== null) {
      router.replace(pathname, { scroll: false });
    }

    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Unlink handler
  // ---------------------------------------------------------------------------

  async function handleUnlink() {
    const confirmed = window.confirm(
      "Möchten Sie die SSO-Verknüpfung wirklich aufheben?"
    );
    if (!confirmed) return;

    setUnlinking(true);
    try {
      const res = await fetch("/api/auth/sso/unlink", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPanelState({
          type: "error",
          message:
            data.error ?? "Fehler beim Aufheben der SSO-Verknüpfung",
        });
        return;
      }
      await fetchStatus();
    } catch {
      setPanelState({
        type: "error",
        message: "Fehler beim Aufheben der SSO-Verknüpfung",
      });
    } finally {
      setUnlinking(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Link handler (full page redirect)
  // ---------------------------------------------------------------------------

  function handleLink() {
    window.location.href = "/api/auth/sso/link/initiate";
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const feedbackMessage =
    feedback !== null ? FEEDBACK_MESSAGES[feedback.key] : null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Single Sign-On (SSO)
      </h2>

      {/* URL feedback (success or error from redirect) */}
      {feedbackMessage && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            feedbackMessage.isError
              ? "border-error-200 bg-error-50 text-error-700"
              : "border-success-200 bg-success-50 text-success-700"
          }`}
          role="alert"
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Panel states */}
      {panelState.type === "loading" && (
        <p className="text-sm text-neutral-500">SSO-Status wird geladen…</p>
      )}

      {panelState.type === "error" && (
        <div>
          <div
            className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
            role="alert"
          >
            {panelState.message}
          </div>
          <button
            onClick={fetchStatus}
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {panelState.type === "linked" && (
        <div>
          <p className="mb-4 text-sm text-neutral-700">
            Ihr Konto ist mit{" "}
            <span className="font-medium text-neutral-900">
              {panelState.provider}
            </span>{" "}
            verknüpft.
          </p>
          <button
            onClick={handleUnlink}
            disabled={unlinking}
            className="rounded-md bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
          >
            {unlinking ? "Wird aufgehoben…" : "Verknüpfung aufheben"}
          </button>
        </div>
      )}

      {panelState.type === "unlinked" && (
        <div>
          <p className="mb-4 text-sm text-neutral-700">
            Ihr Konto ist nicht mit SSO verknüpft.
          </p>
          <button
            onClick={handleLink}
            className="rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
          >
            Mit SSO verknüpfen
          </button>
        </div>
      )}

      {panelState.type === "sso-not-configured" && (
        <div>
          <p className="text-sm text-neutral-500">
            SSO ist aktuell nicht aktiviert. Bitte wenden Sie sich an den Administrator.
          </p>
        </div>
      )}
    </div>
  );
}
