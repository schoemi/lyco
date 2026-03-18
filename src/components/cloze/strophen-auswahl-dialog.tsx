"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WEAKNESS_THRESHOLD } from "@/lib/cloze/constants";
import {
  getWeakStrophenIds,
  hasWeaknesses,
} from "@/lib/cloze/strophen-selection";
import type { StropheDetail, StropheProgress } from "@/types/song";

interface StrophenAuswahlDialogProps {
  songId: string;
  strophen: StropheDetail[];
  activeStrophenIds: Set<string>;
  open: boolean;
  onConfirm: (selectedIds: Set<string>) => void;
  onCancel: () => void;
}

export function StrophenAuswahlDialog({
  songId,
  strophen,
  activeStrophenIds,
  open,
  onConfirm,
  onCancel,
}: StrophenAuswahlDialogProps) {
  const [localSelection, setLocalSelection] =
    useState<Set<string>>(activeStrophenIds);
  const [progress, setProgress] = useState<StropheProgress[] | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Sync localSelection when dialog opens or activeStrophenIds changes
  useEffect(() => {
    if (open) {
      setLocalSelection(new Set(activeStrophenIds));
      setValidationError(null);
    }
  }, [open, activeStrophenIds]);

  // Load progress when dialog opens
  useEffect(() => {
    if (!open) return;

    async function loadProgress() {
      setLoadingProgress(true);
      try {
        const res = await fetch(`/api/progress?songId=${songId}`);
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress ?? data);
        } else {
          setProgress(null);
        }
      } catch {
        setProgress(null);
      } finally {
        setLoadingProgress(false);
      }
    }

    loadProgress();
  }, [open, songId]);

  // Focus trap and escape handling
  useEffect(() => {
    if (!open) return;

    // Focus first focusable element
    requestAnimationFrame(() => {
      firstFocusableRef.current?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  // Sorted strophen by orderIndex
  const sortedStrophen = [...strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  // Progress lookup map
  const progressMap = new Map<string, number>();
  if (progress) {
    for (const p of progress) {
      progressMap.set(p.stropheId, p.prozent);
    }
  }

  // Weakness detection
  const weakIds = progress ? getWeakStrophenIds(progress) : new Set<string>();
  const hasAnyWeakness = progress ? hasWeaknesses(progress) : false;

  // Handlers
  const handleToggle = useCallback(
    (stropheId: string) => {
      setLocalSelection((prev) => {
        const next = new Set(prev);
        if (next.has(stropheId)) {
          next.delete(stropheId);
        } else {
          next.add(stropheId);
        }
        return next;
      });
      setValidationError(null);
    },
    []
  );

  const handleSelectAll = useCallback(() => {
    setLocalSelection(new Set(strophen.map((s) => s.id)));
    setValidationError(null);
  }, [strophen]);

  const handleDeselectAll = useCallback(() => {
    setLocalSelection(new Set());
    setValidationError(null);
  }, []);

  const handlePracticeWeaknesses = useCallback(() => {
    if (!progress) return;
    const weak = getWeakStrophenIds(progress);
    setLocalSelection(weak);
    setValidationError(null);
  }, [progress]);

  const handleConfirm = useCallback(() => {
    if (localSelection.size === 0) {
      setValidationError("Mindestens eine Strophe muss ausgewählt sein");
      return;
    }
    onConfirm(localSelection);
  }, [localSelection, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="strophen-dialog-title"
        className="relative z-10 flex flex-col bg-white shadow-xl
          max-sm:fixed max-sm:inset-0
          sm:mx-4 sm:max-w-[480px] sm:w-full sm:rounded-lg sm:max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2
            id="strophen-dialog-title"
            className="text-lg font-semibold"
          >
            Strophen auswählen
          </h2>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-neutral-500 hover:text-neutral-700"
            aria-label="Dialog schließen"
          >
            ✕
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 border-b px-4 py-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="min-h-[44px] rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Alle auswählen
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="min-h-[44px] rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Alle abwählen
          </button>
          <button
            type="button"
            onClick={handlePracticeWeaknesses}
            disabled={!hasAnyWeakness}
            title={!hasAnyWeakness ? "Keine Schwächen vorhanden" : undefined}
            className="min-h-[44px] rounded bg-warning-100 px-3 py-2 text-sm font-medium text-warning-700 hover:bg-warning-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Schwächen üben
          </button>
        </div>

        {/* Strophen list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loadingProgress && (
            <div className="py-4 text-center text-sm text-neutral-500">
              Fortschritt wird geladen…
            </div>
          )}

          <ul className="space-y-1">
            {sortedStrophen.map((strophe) => {
              const isChecked = localSelection.has(strophe.id);
              const prozent = progressMap.get(strophe.id) ?? 0;
              const isWeak = weakIds.has(strophe.id);

              return (
                <li key={strophe.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded px-2 py-1 hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(strophe.id)}
                      className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="flex-1 text-sm">{strophe.name}</span>
                    {progress && (
                      <span className="text-xs text-neutral-500">{prozent}%</span>
                    )}
                    {isWeak && (
                      <span
                        className="rounded bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700"
                        aria-label="Schwäche – Fortschritt unter 80%"
                      >
                        Schwäche
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Validation error */}
        {validationError && (
          <div
            className="px-4 py-2 text-sm text-error-600"
            role="alert"
          >
            {validationError}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[44px] rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Übung starten
          </button>
        </div>
      </div>
    </div>
  );
}
