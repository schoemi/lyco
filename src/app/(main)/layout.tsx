"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/version";
import { useAppName } from "@/hooks/use-app-name";
import UserMenu from "@/components/user-menu";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const appName = useAppName();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        setIsAdmin(data?.user?.role === "ADMIN");
        setUserName(data?.user?.name ?? "");
      })
      .catch(() => {});
  }, []);

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
            </div>
            <UserMenu userName={userName} isAdmin={isAdmin} />
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
