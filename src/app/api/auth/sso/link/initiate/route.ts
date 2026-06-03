/**
 * LinkInitiator — GET /api/auth/sso/link/initiate
 *
 * Leitet den eingeloggten User zum OIDC-Authorization-Endpoint des konfigurierten
 * SSO-Providers weiter. Legt dabei eine serverseitige SsoLinkingSession mit
 * PKCE-State, Code-Verifier und 15-Minuten-Ablaufzeit an.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.2, 5.4
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSsoConfig } from "@/lib/config/auth-env";
import {
  generateState,
  generateCodeVerifier,
  computeCodeChallenge,
  discoverAuthorizationEndpoint,
} from "@/lib/services/sso-linking-service";
import {
  logAudit,
  SSO_LINK_INITIATED,
} from "@/lib/services/log-service";

export async function GET(): Promise<Response> {
  // 1. Auth-Check — 401 wenn kein User in der Session (Requirement 1.5)
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // 2. SSO-Config-Check — 503 wenn nicht konfiguriert (Requirement 1.4)
  const ssoConfig = getSsoConfig();
  if (!ssoConfig) {
    return NextResponse.json(
      { error: "SSO ist nicht konfiguriert" },
      { status: 503 }
    );
  }

  // 3. OIDC Discovery (Requirement 1.3)
  let authorizationEndpoint: string;
  try {
    authorizationEndpoint = await discoverAuthorizationEndpoint(
      ssoConfig.issuerUrl
    );
  } catch (error) {
    console.error("SSO OIDC-Discovery fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "SSO-Konfigurationsfehler: OIDC-Discovery fehlgeschlagen" },
      { status: 503 }
    );
  }

  // 4. PKCE-Parameter generieren (Requirements 1.1, 5.2, 5.4)
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await computeCodeChallenge(codeVerifier);

  // 5. SsoLinkingSession upserten — expiresAt: now + 15 Minuten (Requirements 1.1, 1.2)
  //    Bei DB-Fehler: 500, kein Redirect (Requirement 1.6)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  try {
    await prisma.ssoLinkingSession.upsert({
      where: { userId },
      create: {
        userId,
        state,
        codeVerifier,
        expiresAt,
      },
      update: {
        state,
        codeVerifier,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("SSO LinkingSession-Upsert fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler beim Anlegen der Linking-Session" },
      { status: 500 }
    );
  }

  // 6. Audit-Log (Fire-and-Forget)
  logAudit({
    action: SSO_LINK_INITIATED,
    actorId: userId,
    details: { provider: "authentik" },
  });

  // 7. Authorization-URL zusammenbauen (Requirements 1.3, 5.4)
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/sso/link/callback`;

  const authUrl = new URL(authorizationEndpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", ssoConfig.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  // 8. 302-Redirect zur Authorization-URL (Requirement 1.3)
  return NextResponse.redirect(authUrl.toString(), { status: 302 });
}
