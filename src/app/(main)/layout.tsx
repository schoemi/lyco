"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/version";
import { useAppName } from "@/hooks/use-app-name";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const appName = useAppName();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.role === "ADMIN"))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <nav className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/dashboard"
                className="text-lg font-semibold text-neutral-900"
                aria-label={`${appName} – Zur Startseite`}
              >
                {appName}
              </Link>
              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium ${
                    pathname === "/dashboard"
                      ? "text-newsong-600"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className={`text-sm font-medium ${
                    pathname === "/profile"
                      ? "text-newsong-600"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Profil
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                  >
                    Admin
                  </Link>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Abmelden"
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
      <footer className="py-4 text-center text-xs text-neutral-400">
        v{APP_VERSION}
      </footer>
    </div>
  );
}
