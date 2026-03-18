"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface UserMenuProps {
  userName: string;
  isAdmin?: boolean;
}

export default function UserMenu({ userName, isAdmin }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [toggling, setToggling] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch current variant from profile on mount
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.profile?.themeVariant === "dark") {
          setVariant("dark");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  async function handleLogout() {
    await signOut({ redirectTo: "/login" });
  }

  const handleVariantToggle = useCallback(async () => {
    if (toggling) return;
    const newVariant = variant === "light" ? "dark" : "light";
    setToggling(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeVariant: newVariant }),
      });

      if (res.ok) {
        setVariant(newVariant);
        // Trigger ThemeHydrator to re-fetch and re-apply CSS vars
        window.dispatchEvent(new CustomEvent("theme-variant-changed"));
      }
    } catch {
      // silently ignore
    } finally {
      setToggling(false);
    }
  }, [variant, toggling]);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-newsong-100 text-xs font-semibold text-newsong-700">
          {initials}
        </span>
        <span className="hidden sm:inline">{userName}</span>
        <svg
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Profil
          </Link>
          {isAdmin && (
            <Link
              href="/admin/users"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Admin
            </Link>
          )}
          <div className="my-1 border-t border-neutral-100" />
          {/* Light/Dark variant toggle */}
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-neutral-700">
              {variant === "light" ? "Light" : "Dark"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={variant === "dark"}
              aria-label="Dark Mode umschalten"
              disabled={toggling}
              onClick={handleVariantToggle}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 ${
                variant === "dark" ? "bg-newsong-600" : "bg-neutral-200"
              } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  variant === "dark" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="my-1 border-t border-neutral-100" />
          <button
            role="menuitem"
            onClick={handleLogout}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-neutral-50"
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
