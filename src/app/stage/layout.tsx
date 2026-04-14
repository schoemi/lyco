"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface StageLayoutProps {
  children: React.ReactNode;
}

export default function StageLayout({ children }: StageLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    // Auth check: redirect unauthenticated users to /login
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
        }
      })
      .catch(() => {
        router.replace("/login");
      });

    // Request fullscreen to hide address bar (Req 1.3)
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen may be denied — silently ignore
      });
    }

    // Register Service Worker (Req 2.2)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/stage-sw.js").catch(() => {
        // SW registration failure is non-fatal
      });
    }
  }, [router]);

  return (
    <div
      style={{ backgroundColor: "#000000", minHeight: "100vh", color: "#FFFFFF" }}
      data-testid="stage-layout"
    >
      {children}
    </div>
  );
}
