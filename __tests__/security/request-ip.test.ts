import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/utils/request-ip";

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", { headers });
}

describe("getClientIp", () => {
  it("extracts first IP from x-forwarded-for header", () => {
    const request = createRequest({
      "x-forwarded-for": "203.0.113.50, 70.41.3.18, 150.172.238.178",
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  it("trims whitespace from x-forwarded-for value", () => {
    const request = createRequest({
      "x-forwarded-for": "  203.0.113.50 , 70.41.3.18",
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  it("handles single IP in x-forwarded-for", () => {
    const request = createRequest({
      "x-forwarded-for": "192.168.1.1",
    });
    expect(getClientIp(request)).toBe("192.168.1.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = createRequest({
      "x-real-ip": "10.0.0.1",
    });
    expect(getClientIp(request)).toBe("10.0.0.1");
  });

  it("trims whitespace from x-real-ip value", () => {
    const request = createRequest({
      "x-real-ip": "  10.0.0.1  ",
    });
    expect(getClientIp(request)).toBe("10.0.0.1");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const request = createRequest({
      "x-forwarded-for": "203.0.113.50",
      "x-real-ip": "10.0.0.1",
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  it('returns "unknown" when no IP headers are present', () => {
    const request = createRequest();
    expect(getClientIp(request)).toBe("unknown");
  });
});
