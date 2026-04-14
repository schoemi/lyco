/**
 * Unit-Test für Stage-Layout (src/app/stage/layout.tsx)
 *
 * Testet:
 * - Schwarzer Hintergrund (#000000) (Anforderung 1.1)
 * - Kein Navigation-Chrome (kein <nav>, kein <header>, kein <footer>) (Anforderung 1.2)
 * - Fullscreen-API-Aufruf (document.documentElement.requestFullscreen) (Anforderung 1.3)
 * - Auth-Prüfung und Weiterleitung zu /login (Anforderung 1.4)
 * - Service-Worker-Registrierung (Anforderung 2.2)
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const LAYOUT_PATH = path.resolve(
  process.cwd(),
  "src/app/stage/layout.tsx"
);
const source = fs.readFileSync(LAYOUT_PATH, "utf-8");

describe("StageLayout source", () => {
  // --- Directive ---

  it('uses "use client" directive', () => {
    expect(source).toContain('"use client"');
  });

  // --- Schwarzer Hintergrund (Req 1.1) ---

  it("sets black background color #000000 (Req 1.1)", () => {
    expect(source).toContain("#000000");
    expect(source).toContain("backgroundColor");
  });

  // --- Kein Navigation-Chrome (Req 1.2) ---

  it("does not render a <nav> element (Req 1.2)", () => {
    // The layout must not contain a nav element
    expect(source).not.toMatch(/<nav[\s>]/);
  });

  it("does not render a <header> element (Req 1.2)", () => {
    expect(source).not.toMatch(/<header[\s>]/);
  });

  it("does not render a <footer> element (Req 1.2)", () => {
    expect(source).not.toMatch(/<footer[\s>]/);
  });

  // --- Fullscreen-API (Req 1.3) ---

  it("calls document.documentElement.requestFullscreen on mount (Req 1.3)", () => {
    expect(source).toContain("requestFullscreen");
    expect(source).toContain("document.documentElement");
  });

  // --- Auth-Prüfung (Req 1.4) ---

  it("fetches /api/auth/session for auth check (Req 1.4)", () => {
    expect(source).toContain("/api/auth/session");
  });

  it("redirects to /login when not authenticated (Req 1.4)", () => {
    expect(source).toContain('"/login"');
    expect(source).toMatch(/router\.(replace|push)\(\s*"\/login"\s*\)/);
  });

  it("checks for missing user in session data (Req 1.4)", () => {
    expect(source).toMatch(/!\s*data\?\.user/);
  });

  // --- Service Worker (Req 2.2) ---

  it("registers service worker /stage-sw.js (Req 2.2)", () => {
    expect(source).toContain("serviceWorker");
    expect(source).toContain('register("/stage-sw.js")');
  });

  it("checks for serviceWorker support before registering (Req 2.2)", () => {
    expect(source).toContain('"serviceWorker" in navigator');
  });

  // --- Eigenständiges Layout (Req 1.5) ---

  it("is outside (main) layout — no navigation imports (Req 1.5)", () => {
    expect(source).not.toContain("UserMenu");
    expect(source).not.toContain("MainLayout");
  });

  it("renders children inside the layout wrapper", () => {
    expect(source).toContain("{children}");
  });
});
