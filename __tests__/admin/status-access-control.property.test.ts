/**
 * Property 11: API-Zugriffskontrolle für Kontostatus-Operationen
 *
 * Für jede API-Route zur Kontostatus-Änderung oder Einstellungsverwaltung
 * und jeden Benutzer gilt:
 * - Ohne gültige Session → HTTP 401
 * - Mit Rolle "USER" → HTTP 403
 * - Mit Rolle "ADMIN" → Anfrage wird zugelassen (kein 401/403)
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

const PBT_CONFIG = { numRuns: 100 };

// --- Mocks ---

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/services/user-service", () => ({
  suspendUser: vi.fn().mockResolvedValue({ id: "u1", accountStatus: "SUSPENDED" }),
  activateUser: vi.fn().mockResolvedValue({ id: "u1", accountStatus: "ACTIVE" }),
  approveUser: vi.fn().mockResolvedValue({ id: "u1", accountStatus: "ACTIVE" }),
  rejectUser: vi.fn().mockResolvedValue(undefined),
  getPendingCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/services/system-setting-service", () => ({
  getRequireApproval: vi.fn().mockResolvedValue(false),
  setRequireApproval: vi.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from "next/server";
import { PATCH as statusPATCH } from "@/app/api/users/[id]/status/route";
import { POST as approvePOST } from "@/app/api/users/[id]/approve/route";
import { POST as rejectPOST } from "@/app/api/users/[id]/reject/route";
import { GET as pendingCountGET } from "@/app/api/users/pending/count/route";
import { GET as settingsGET, PUT as settingsPUT } from "@/app/api/settings/require-approval/route";

// --- Helpers ---

function makeRequest(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest(`http://localhost${url}`, opts);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// --- Route definitions ---

interface RouteDefinition {
  name: string;
  call: () => Promise<Response>;
}

const idArb = fc.uuid();

function buildRoutes(userId: string): RouteDefinition[] {
  return [
    {
      name: "PATCH /api/users/[id]/status",
      call: () =>
        statusPATCH(
          makeRequest(`/api/users/${userId}/status`, "PATCH", { status: "SUSPENDED" }),
          makeParams(userId)
        ),
    },
    {
      name: "POST /api/users/[id]/approve",
      call: () =>
        approvePOST(
          makeRequest(`/api/users/${userId}/approve`, "POST"),
          makeParams(userId)
        ),
    },
    {
      name: "POST /api/users/[id]/reject",
      call: () =>
        rejectPOST(
          makeRequest(`/api/users/${userId}/reject`, "POST"),
          makeParams(userId)
        ),
    },
    {
      name: "GET /api/users/pending/count",
      call: () => pendingCountGET(),
    },
    {
      name: "GET /api/settings/require-approval",
      call: () => settingsGET(),
    },
    {
      name: "PUT /api/settings/require-approval",
      call: () =>
        settingsPUT(
          makeRequest("/api/settings/require-approval", "PUT", { value: true })
        ),
    },
  ];
}

// Arbitrary: pick a route index (0..5)
const routeIndexArb = fc.integer({ min: 0, max: 5 });

// --- Tests ---

describe("Property 11: API-Zugriffskontrolle für Kontostatus-Operationen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Ohne gültige Session → HTTP 401
   */
  it("Ohne Session → HTTP 401 für alle Kontostatus-Routen", () => {
    fc.assert(
      fc.asyncProperty(idArb, routeIndexArb, async (userId, routeIdx) => {
        mockAuth.mockResolvedValue(null);
        const routes = buildRoutes(userId);
        const route = routes[routeIdx];
        const res = await route.call();
        expect(res.status).toBe(401);
      }),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Mit Rolle "USER" → HTTP 403
   */
  it("User-Rolle → HTTP 403 für alle Kontostatus-Routen", () => {
    fc.assert(
      fc.asyncProperty(idArb, routeIndexArb, async (userId, routeIdx) => {
        mockAuth.mockResolvedValue({
          user: { id: "user-session", email: "user@test.com", role: "USER" },
        });
        const routes = buildRoutes(userId);
        const route = routes[routeIdx];
        const res = await route.call();
        expect(res.status).toBe(403);
      }),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Mit Rolle "ADMIN" → Anfrage zugelassen (kein 401/403)
   */
  it("Admin-Rolle → Zugriff erlaubt (kein 401/403) für alle Kontostatus-Routen", () => {
    fc.assert(
      fc.asyncProperty(idArb, routeIndexArb, async (userId, routeIdx) => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-session", email: "admin@test.com", role: "ADMIN" },
        });
        const routes = buildRoutes(userId);
        const route = routes[routeIdx];
        const res = await route.call();
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      }),
      PBT_CONFIG
    );
  });
});
