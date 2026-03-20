"use client";

import { useEffect, useRef, useState } from "react";
import type { ImportConflict } from "@/lib/backup/backup-types";

interface KonfliktDialogProps {
  conflicts: ImportConflict[];
  onResolve: (resolutions: Record<string, "overwrite" | "new">) => void;
  onCancel: () => void;
}

export default function KonfliktDialog({
  conflicts,
  onResolve,
  onCancel,
}: KonfliktDialogProps) {
  const [resolutions, setResolutions] = useState<
    Record<string, "overwrite" | "new">
  >(() => {
    const initial: Record<string, "overwrite" | "new"> = {};
    for (const c of conflicts) {
      initial[c.originalId] = "new";
    }
    return initial;
  });

  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the element that had focus before the dialog opened
  useEffect(() => {
    triggerRef.current = document.activeElement;
  }, []);

  // Focus the cancel button when the dialog opens
  useEffect(() => {
    requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });
  }, []);

  // Handle Escape key to close dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  function handleClose() {
    onCancel();
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }

  function setResolution(id: string, value: "overwrite" | "new") {
    setResolutions((prev) => ({ ...prev, [id]: value }));
  }

  const allResolved = conflicts.every((c) => resolutions[c.originalId] != null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="konflikt-dialog-title"
      onClick={handleClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4">
          <h2
            id="konflikt-dialog-title"
            className="text-lg font-semibold text-neutral-900"
          >
            Konflikte beim Import
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            {conflicts.length === 1
              ? "Ein Song existiert bereits. Wie soll damit verfahren werden?"
              : `${conflicts.length} Songs existieren bereits. Wie soll mit ihnen verfahren werden?`}
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto px-6 py-4">
          <ul className="space-y-4" role="list">
            {conflicts.map((conflict) => (
              <li
                key={conflict.originalId}
                className="rounded-md border border-neutral-200 p-3"
              >
                <p className="mb-1 text-sm font-medium text-neutral-900">
                  Archiv: <span className="font-semibold">{conflict.titel}</span>
                </p>
                <p className="mb-3 text-sm text-neutral-600">
                  Vorhanden: <span className="font-medium">{conflict.existingTitle}</span>
                </p>

                <fieldset>
                  <legend className="sr-only">
                    Aktion für „{conflict.titel}"
                  </legend>
                  <div className="flex gap-3">
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                        resolutions[conflict.originalId] === "new"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`resolution-${conflict.originalId}`}
                        value="new"
                        checked={resolutions[conflict.originalId] === "new"}
                        onChange={() =>
                          setResolution(conflict.originalId, "new")
                        }
                        className="sr-only"
                      />
                      Als neuen Song importieren
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                        resolutions[conflict.originalId] === "overwrite"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`resolution-${conflict.originalId}`}
                        value="overwrite"
                        checked={
                          resolutions[conflict.originalId] === "overwrite"
                        }
                        onChange={() =>
                          setResolution(conflict.originalId, "overwrite")
                        }
                        className="sr-only"
                      />
                      Überschreiben
                    </label>
                  </div>
                </fieldset>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => onResolve(resolutions)}
            disabled={!allResolved}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Importieren
          </button>
        </div>
      </div>
    </div>
  );
}
