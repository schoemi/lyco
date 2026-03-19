"use client";

import { useEffect, useRef, useState } from "react";

interface SetEditDialogProps {
  open: boolean;
  set?: { id: string; name: string; description: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SetEditDialog({ open, set, onClose, onSaved }: SetEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const isEditMode = !!set;

  // Capture the element that had focus before the dialog opened
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Pre-fill fields when editing, clear when creating
  useEffect(() => {
    if (open) {
      if (set) {
        setName(set.name);
        setDescription(set.description ?? "");
      } else {
        setName("");
        setDescription("");
      }
      setNameError(null);
      setDescriptionError(null);
      setError(null);
    }
  }, [open, set]);

  // Focus the name input when the dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    }
  }, [open]);

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  if (!open) return null;

  function validate(): boolean {
    let valid = true;
    setNameError(null);
    setDescriptionError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name ist erforderlich");
      valid = false;
    } else if (trimmedName.length > 100) {
      setNameError("Name darf maximal 100 Zeichen lang sein");
      valid = false;
    }

    if (description.length > 500) {
      setDescriptionError("Beschreibung darf maximal 500 Zeichen lang sein");
      valid = false;
    }

    return valid;
  }

  function handleClose() {
    setError(null);
    setNameError(null);
    setDescriptionError(null);
    onClose();
    // Return focus to the trigger element
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setError(null);
    setLoading(true);

    const trimmedName = name.trim();
    const body = { name: trimmedName, description: description || undefined };

    try {
      const url = isEditMode ? `/api/sets/${set!.id}` : "/api/sets";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Speichern");
        return;
      }

      onSaved();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? "Set bearbeiten" : "Neues Set erstellen"}
      onClick={handleClose}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          {isEditMode ? "Set bearbeiten" : "Neues Set erstellen"}
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="set-name" className="mb-1 block text-sm font-medium text-neutral-700">
              Name <span className="text-error-600">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="set-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              maxLength={100}
              className={`w-full rounded-md border px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                nameError ? "border-error-500" : "border-neutral-300"
              }`}
              placeholder="z.B. Konzert März 2025"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "set-name-error" : undefined}
            />
            {nameError && (
              <p id="set-name-error" className="mt-1 text-sm text-error-600" role="alert">
                {nameError}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label htmlFor="set-description" className="mb-1 block text-sm font-medium text-neutral-700">
              Beschreibung
            </label>
            <textarea
              id="set-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (descriptionError) setDescriptionError(null);
              }}
              maxLength={500}
              rows={3}
              className={`w-full rounded-md border px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                descriptionError ? "border-error-500" : "border-neutral-300"
              }`}
              placeholder="Optionale Beschreibung..."
              aria-invalid={!!descriptionError}
              aria-describedby={descriptionError ? "set-description-error" : undefined}
            />
            {descriptionError && (
              <p id="set-description-error" className="mt-1 text-sm text-error-600" role="alert">
                {descriptionError}
              </p>
            )}
          </div>
          {error && (
            <p className="mb-4 text-sm text-error-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Speichere..." : isEditMode ? "Speichern" : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
