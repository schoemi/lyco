"use client";

interface RejectUserDialogProps {
  open: boolean;
  userName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RejectUserDialog({ open, userName, onConfirm, onCancel }: RejectUserDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Benutzer ablehnen</h2>
        <p className="mb-4 text-sm text-gray-600">
          Möchten Sie den Benutzer <span className="font-medium">{userName}</span> wirklich ablehnen?
          Der Benutzer wird unwiderruflich gelöscht.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  );
}
