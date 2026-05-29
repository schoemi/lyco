import { NextResponse } from "next/server";
import { isSsoConfigured } from "@/lib/config/auth-env";

/**
 * GET /api/auth/sso/status
 *
 * Returns whether SSO (Authentik OIDC) is configured on the server.
 * This is a public endpoint — the login page uses it to decide
 * whether to show the "Mit SSO anmelden" button.
 */
export async function GET() {
  return NextResponse.json({ configured: isSsoConfigured() });
}
