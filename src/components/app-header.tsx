"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { StreakPill } from "@/components/gamification/streak-pill";
import { useAppName } from "@/hooks/use-app-name";

export default function AppHeader() {
  const [streak, setStreak] = useState(0);
  const appName = useAppName();

  const fetchStreak = useCallback(async () => {
    try {
      const res = await fetch("/api/streak");
      if (res.ok) {
        const data = await res.json();
        setStreak(data.streak);
      }
    } catch {
      // Silently ignore – streak display is non-critical
    }
  }, []);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  useEffect(() => {
    const handleStreakUpdated = () => {
      fetchStreak();
    };
    window.addEventListener("streak-updated", handleStreakUpdated);
    return () => {
      window.removeEventListener("streak-updated", handleStreakUpdated);
    };
  }, [fetchStreak]);

  async function handleLogout() {
    await signOut({ redirectTo: "/login" });
  }

  return (
    <nav className="border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-neutral-900">
            {appName}
          </Link>
          <div className="flex items-center gap-3">
            <StreakPill streak={streak} />
            <button
              onClick={handleLogout}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
