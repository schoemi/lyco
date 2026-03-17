/**
 * Middleware Unit Tests: Route-Schutz, Rolle-Check, Kontostatus-Prüfung
 *
 * Validates: Requirements 3.4, 4.3, 4.4, 4.5, 7.1, 7.2
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock session that the middleware will see via req.auth
let mockSession: { user: { role: string; accountStatus?: string } } | null = null;

// Mock next-auth (the actual import used by middleware.ts)
vi.mock("next-auth", () => ({
  default: (/* config */) => ({
    auth: (handler: (req: unknown) => unknown) => {
      return (req: { nextUrl: { pathname: string }; url: string; auth?: unknown; cookies?: unknown }) => {
        req.auth = mockSession;
        return handler(req);
      };
    },
  }),
}));

// Mock auth.config to avoid edge-runtime issues in tests
vi.mock("@/lib/auth.config", () => ({
  authConfig: {},
}));

let middleware: (req: {
  nextUrl: { pathname: string };
  url: string;
  auth?: unknown;
  cookies: {
    has: (name: string) => boolean;
    get: (name: string) => { name: string; value: string } | undefined;
  };
}) => unknown;
let config: { matcher: string[] };

function createRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieStore = new Map(Object.entries(cookies));
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    auth: undefined as unknown,
    cookies: {
