"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * TagPopover – Reusable popover for editing the zusatztext of a ChordPro tag.
 *
 * Extracted from InlineBadge so it can be reused in other contexts
 * (e.g. autocomplete insertion, toolbar tag insertion).
 *
 * Validates: Requirements 5.4, 5.5
 */

export interface TagPopoverProps {
  /** Display label for the tag (e.g. "Belting") */
  label: string;
  /** Accent color for the confirm button */
  color: string;
  /** Current zusatztext value */
  initialValue: string;
  /** Called when the user confirms the edit */
  onConfirm: (zusatztext: string) => void;
  /** Called when the user cancels (Escape, click outside, Abbrechen) */
  onCancel: () => void;
}

export function TagPopover({
  label,
  color,
  initialValue,
  onConfirm,
  onCancel,
}: TagPopoverProps) {
  const [editText, setEditText] = useState(initialValue);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    onConfirm(editText);
  }, [editText, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleConfirm, onCancel],
  );

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${label} Zusatztext bearbeiten`}
      className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
    >
      <label className="mb-1 block text-xs font-medium text-neutral-600">
        {label} – Zusatztext
      </label>
      <input
        ref={inputRef}
        type="text"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="z.B. Luftig singen"
        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded px-2 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
