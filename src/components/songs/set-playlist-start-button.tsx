"use client";

import { useState } from "react";

export interface SetPlaylistStartButtonProps {
  /** false → Button deaktiviert + Inline-Hinweismeldung anzeigbar (Req. 1.3, 1.6) */
  hasPlayableSongs: boolean;
  onStart: () => void;
}

/**
 * „Set abspielen"-Button auf der Set-Detailseite.
 *
 * - Wenn `hasPlayableSongs === true`: Button aktiv, Klick startet die Playlist.
 * - Wenn `hasPlayableSongs === false`: Button deaktiviert, Klick zeigt eine
 *   Inline-Hinweismeldung. Die Meldung bleibt sichtbar bis der Nutzer sie
 *   explizit über den Schließen-Button schließt (Req. 1.3, 1.6).
 */
export default function SetPlaylistStartButton({
  hasPlayableSongs,
  onStart,
}: SetPlaylistStartButtonProps) {
  const [showMessage, setShowMessage] = useState(false);

  function handleClick() {
    if (!hasPlayableSongs) {
      setShowMessage(true);
      return;
    }
    onStart();
  }

  function handleDismiss() {
    setShowMessage(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={false} // Button bleibt klickbar um die Meldung auszulösen
        aria-disabled={!hasPlayableSongs}
        aria-label="Set abspielen"
        className={[
          "inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
          hasPlayableSongs
            ? "bg-newsong-600 text-white hover:bg-newsong-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-newsong-600"
            : "cursor-not-allowed bg-neutral-200 text-neutral-500 hover:bg-neutral-200",
        ].join(" ")}
      >
        <PlayIcon />
        Set abspielen
      </button>

      {showMessage && !hasPlayableSongs && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-3 rounded-md border border-warning-300 bg-warning-50 px-4 py-3 text-sm text-warning-800"
        >
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
          <span className="flex-1">
            Dieses Set enthält keine Songs mit einer MP3-Audioquelle. Bitte füge
            zunächst MP3-Audioquellen hinzu, um das Set abspielen zu können.
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Hinweis schließen"
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-warning-600 transition-colors hover:bg-warning-100 hover:text-warning-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-warning-600"
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Icons ── */

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}
