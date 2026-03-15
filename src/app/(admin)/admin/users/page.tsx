"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { UserResponse } from "../../../../types/auth";
import UserCreateDialog from "@/components/admin/user-create-dialog";
import UserEditDialog from "@/components/admin/user-edit-dialog";
import UserDeleteDialog from "@/components/admin/user-delete-dialog";
import PasswordResetDialog from "@/components/admin/password-reset-dialog";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserResponse | null>(null);
  const [resetUser, setResetUser] = useState<UserResponse | null>(null);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setUsers(data.users);
      setError(null);
    } catch {
      setError("Benutzer konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function handleCreated(user: UserResponse) {
    setUsers((prev) => [...prev, user]);
    setCreateOpen(false);
  }

  function handleUpdated(updated: UserResponse) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditUser(null);
  }

  function handleDeleted(userId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setDeleteUser(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Benutzerverwaltung</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Neuer Benutzer
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Lade Benutzer...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">E-Mail</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rolle</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Erstellt am</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{user.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{user.name || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button onClick={() => setEditUser(user)} className="mr-2 text-blue-600 hover:text-blue-800">Bearbeiten</button>
                    <button onClick={() => setResetUser(user)} className="mr-2 text-yellow-600 hover:text-yellow-800">Passwort</button>
                    <button onClick={() => setDeleteUser(user)} className="text-red-600 hover:text-red-800">Löschen</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Keine Benutzer vorhanden.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <UserCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      <UserEditDialog open={!!editUser} user={editUser} onClose={() => setEditUser(null)} onUpdated={handleUpdated} />
      <UserDeleteDialog open={!!deleteUser} user={deleteUser} currentUserId={session?.user?.id} onClose={() => setDeleteUser(null)} onDeleted={handleDeleted} />
      <PasswordResetDialog open={!!resetUser} user={resetUser} onClose={() => setResetUser(null)} />
    </div>
  );
}
