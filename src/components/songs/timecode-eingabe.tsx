"use client";

import { useState, useEffect, useRef } from "react";
import { parseTimecode, formatTimecode, isValidTimecode } from "@/lib/audio/timecode";

interface TimecodeEingabeProps {
  stropheId: string;
  initialTimecodeMs: number | null;
  existingMarkupId?: string | null;
  onTimecodeChanged: (timecodeMs: number | null, markupId?: string) => void;
}

export default function TimecodeEingabe({
  stropheId,
  initialTimecodeMs,
  existingMarkupId = null,
  onTimecodeChanged,
}: TimecodeEingabeProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [markupId, setMarkupId] = useState<string | null>(existingMarkupId);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize input value from initialTimecodeMs
  useEffect(() => {
    if (initialTimecodeMs !== null && initialTimecodeMs !== undefined) {
      setInputValue(formatTimecode(initialTimecodeMs));
    } else {
      setInputValue("");
    }
  }, [initialTimecodeMs]);

  // Sync markupId when prop changes (e.g. after parent re-fetches)
  useEffect(() => {
    setMarkupId(existingMarkupId);
  }, [existingMarkupId]);

  async function saveTimecode() {
    setError(null);
    const trimmed = inputValue.trim();

    // Allow clearing the timecode
    if (trimmed === "") {
      // If there was a markup, we could delete it, but for now just signal null
      onTimecodeChanged(null);
      return;
    }

    // Validate format
    if (!isValidTimecode(trimmed)) {
      setError("Ungültiges Format. Erwartet: mm:ss oder Sekunden");
      return;
    }

    const timecodeMs = parseTimecode(trimmed);
    if (timecodeMs === null) {
      setError("Ungültiges Format. Erwartet: mm:ss oder Sekunden");
      return;
    }

    setSaving(true);
    try {
      let res: Response;

      if (markupId) {
        // Update existing markup
        res = await fetch(`/api/markups/${markupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timecodeMs }),
        });
      } else {
        // Create new markup
        res = await fetch("/api/markups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typ: "TIMECODE",
            ziel: "STROPHE",
            stropheId,
            timecodeMs,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Speichern");
        return;
      }

      const data = await res.json();
      // Store the markup ID for future updates
      if (data.markup?.id) {
        setMarkupId(data.markup.id);
      }

      onTimecodeChanged(timecodeMs, data.markup?.id ?? markupId ?? undefined);
      // Normalize display to [mm:ss] format
      setInputValue(formatTimecode(timecodeMs));
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  function handleBlur() {
    saveTimecode();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTimecode();
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <label htmlFor={`timecode-${stropheId}`} className="sr-only">
        Timecode
      </label>
      <input
        ref={inputRef}
        id={`timecode-${stropheId}`}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (error) setError(null);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="mm:ss"
        disabled={saving}
        aria-invalid={error !== null}
        aria-describedby={error ? `timecode-error-${stropheId}` : undefined}
        className={`w-20 rounded-md border px-2 py-1 text-xs font-mono text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 disabled:opacity-50 ${
          error ? "border-error-500" : "border-neutral-300"
        }`}
      />
      {error && (
        <span
          id={`timecode-error-${stropheId}`}
          className="text-xs text-error-600"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
