"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PendingCountBadge from "@/components/admin/pending-count-badge";
import { useAppName } from "@/hooks/use-app-name";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const appName = useAppName();

  async function handleLogout() {
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <nav className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-lg font-semibold text-neutral-900"
              >
                {appName}
              </Link>
              <Link
                href="/admin/users"
                className={`text-sm font-medium ${
                  pathname?.startsWith("/admin/users")
                    ? "text-newsong-600"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Benutzer
                <PendingCountBadge />
              </Link>
              <Link
                href="/admin/settings"
                className={`text-sm font-medium ${
                  pathname?.startsWith("/admin/settings")
                    ? "text-newsong-600"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Einstellungen
              </Link>
              <Link
                href="/admin/theming"
                className={`text-sm font-medium ${
                  pathname?.startsWith("/admin/theming")
                    ? "text-newsong-600"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Theming
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
            >
              Abmelden
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
