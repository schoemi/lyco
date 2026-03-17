"use client";

import { useState } from "react";
import type { AccountStatus } from "../../types/auth";
import RejectUserDialog from "./reject-user-dialog";

interface UserStatusActionsProps {
  userId: string;
  userName: string | null;
  accountStatus: AccountStatus;
  currentUserId: string;
  onStatusChanged: () => void;
}

export default function UserStatusActions({
  userId,
  userName,
  accountStatus,
  currentUserId,
  onStatusChanged,
}: UserStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const isSelf = userId === currentUserId;

  async function handleStatusChange(newStatus: "ACTIVE" | "SUSPENDED") {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Statuswechsel");
        return;
      }
      onStatusChanged();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Bestätigen");
        return;
      }
      onStatusChanged();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Ablehnen");
        return;
      }
      onStatusChanged();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {(accountStatus === "ACTIVE" || accountStatus === "SUSPENDED") && (
        <>
          {accountStatus === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => handleStatusChange("SUSPENDED")}
              disabled={loading || isSelf}
              title={isSelf ? "Eigenes Konto kann nicht gesperrt werden" : "Benutzer sperren"}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : "Sperren"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStatusChange("ACTIVE")}
              disabled={loading}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : "Entsperren"}
            </button>
          )}
        </>
      )}

      {accountStatus === "PENDING" && (
        <>
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Bestätigen"}
          </button>
          <button
            type="button"
            onClick={() => setRejectDialogOpen(true)}
            disabled={loading}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Ablehnen"}
          </button>
        </>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}

      <RejectUserDialog
        open={rejectDialogOpen}
        userName={userName}
        onConfirm={() => {
          setRejectDialogOpen(false);
          handleReject();
        }}
        onCancel={() => setRejectDialogOpen(false)}
      />
    </div>
  );
}
