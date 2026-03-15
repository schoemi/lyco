import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock setup-service
vi.mock("@/lib/services/setup-service", () => ({
  isSetupRequired: vi.fn(),
  createInitialAdmin: vi.fn(),
}));

import { isSetupRequired, createInitialAdmin } from "@/lib/services/setup-service";
import { GET } from "@/app/api/setup/status/route";
import { POST } from "@/app/api/setup/route";
import { NextRequest } from "next/server";

const mockIsSetupRequired = vi.mocked(isSetupRequired);
const mockCreateInitialAdmin = vi.mocked(createInitialAdmin);

function createPostRequest(body: Record<string, unknown>, url = "http://localhost:3000/api/setup") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Setup API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/setup/status", () => {
    it("returns { required: true } when no admin exists", async () => {
      mockIsSetupRequired.mockResolvedValue(true);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ required: true });
    });

    it("returns { required: false } when admin exists", async () => {
      mockIsSetupRequired.mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ required: false });
    });

    it("returns 500 on unexpected error", async () => {
      mockIsSetupRequired.mockRejectedValue(new Error("DB connection failed"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Interner Serverfehler");
    });
  });

  describe("POST /api/setup", () => {
    const validBody = {
      email: "admin@example.com",
      name: "Admin User",
      password: "securepassword123",
    };

    const createdUser = {
      id: "cuid123",
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("creates initial admin and returns 201", async () => {
      mockIsSetupRequired.mockResolvedValue(true);
      mockCreateInitialAdmin.mockResolvedValue(createdUser);

      const request = createPostRequest(validBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toEqual(expect.objectContaining({
        id: "cuid123",
        email: "admin@example.com",
        role: "ADMIN",
      }));
      expect(mockCreateInitialAdmin).toHaveBeenCalledWith({
        email: validBody.email,
        name: validBody.name,
        password: validBody.password,
      });
    });

    it("redirects to /login when admin already exists", async () => {
      mockIsSetupRequired.mockResolvedValue(false);

      const request = createPostRequest(validBody);
      const response = await POST(request);

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("returns 400 when email is missing", async () => {
      mockIsSetupRequired.mockResolvedValue(true);

      const request = createPostRequest({ name: "Admin", password: "12345678" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Alle Felder sind erforderlich");
    });

    it("returns 400 when name is missing", async () => {
      mockIsSetupRequired.mockResolvedValue(true);

      const request = createPostRequest({ email: "a@b.com", password: "12345678" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Alle Felder sind erforderlich");
    });

    it("returns 400 when password is missing", async () => {
      mockIsSetupRequired.mockResolvedValue(true);

      const request = createPostRequest({ email: "a@b.com", name: "Admin" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Alle Felder sind erforderlich");
    });

    it("returns 400 for invalid email", async () => {
      mockIsSetupRequired.mockResolvedValue(true);
      mockCreateInitialAdmin.mockRejectedValue(new Error("Ungültige E-Mail-Adresse"));

      const request = createPostRequest({ email: "invalid", name: "Admin", password: "12345678" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Ungültige E-Mail-Adresse");
    });

    it("returns 400 for short password", async () => {
      mockIsSetupRequired.mockResolvedValue(true);
      mockCreateInitialAdmin.mockRejectedValue(
        new Error("Passwort muss mindestens 8 Zeichen lang sein")
      );

      const request = createPostRequest({ email: "a@b.com", name: "Admin", password: "short" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Passwort muss mindestens 8 Zeichen lang sein");
    });

    it("redirects when setup already completed (race condition)", async () => {
      mockIsSetupRequired.mockResolvedValue(true);
      mockCreateInitialAdmin.mockRejectedValue(
        new Error("Setup wurde bereits abgeschlossen")
      );

      const request = createPostRequest(validBody);
      const response = await POST(request);

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("returns 500 on unexpected error", async () => {
      mockIsSetupRequired.mockResolvedValue(true);
      mockCreateInitialAdmin.mockRejectedValue(new Error("DB connection failed"));

      const request = createPostRequest(validBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Interner Serverfehler");
    });
  });
});
