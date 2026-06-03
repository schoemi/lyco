/**
 * LinkCallbackHandler — GET /api/auth/sso/link/callback
 *
 * Verarbeitet den OIDC-Callback nach erfolgter Authentifizierung beim Provider.
 * Validiert den State, tauscht den Code gegen ein ID-Token, prüft auf Konflikte
 * und legt den SsoAccount per Upsert an.
 *
 * Sicherheitsinvariante (Requirement 5.1): Die userId stammt IMMER aus der
 * serverseitig gespeicherten SsoLinkingSession — niemals aus dem ID-Token,
 * URL-Parametern oder dem Request-Body.
 *
 * Requirements: 2.1–2.10, 5.1–5.7
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSsoConfig } from "@/lib/config/auth-env";
import {
  exchangeCodeForToken,
  verifyIdToken,
} from "@/lib/services/sso-linking-service";
import {
  logAudit,
  SSO_LINK_DENIED,
  SSO_LINK_FAILED,
  SSO_LINK_CONFLICT,
  SSO_LINK_SUCCESS,
  SSO_LINK_STATE_REPLAY,
} from "@/lib/services/log-service";

/**
 * Hilfsfunktion: Löscht eine SsoLinkingSession anhand des State-Parameters.
 * Fehler werden ignoriert (Best-Effort-Cleanup).
 */
async function deleteLinkingSessionByState(
  state: string | null
): Promise<void> {
  if (!state) return;
  try {
    await prisma.ssoLinkingSession.deleteMany({ where: { state } });
  } catch {
    // Best-Effort — Cleanup-Fehler nicht nach oben propagieren
  }
}

/**
 * Hilfsfunktion: Löscht eine SsoLinkingSession anhand der ID.
 * Fehler werden ignoriert (Best-Effort-Cleanup).
 */
async function deleteLinkingSessionById(id: string): Promise<void> {
  try {
    await prisma.ssoLinkingSession.delete({ where: { id } });
  } catch {
    // Best-Effort — Session könnte bereits gelöscht sein
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // -----------------------------------------------------------------------
  // Schritt 1: Provider-Fehler abfangen (Requirement 2.3)
  // -----------------------------------------------------------------------
  if (error) {
    // Session anhand des State-Parameters löschen (Best-Effort)
    await deleteLinkingSessionByState(state);

    await logAudit({
      action: SSO_LINK_DENIED,
      details: { provider: "authentik", providerError: error },
    });

    return NextResponse.redirect(
      new URL("/profile?error=sso-link-denied", process.env.NEXTAUTH_URL)
    );
  }

  // -----------------------------------------------------------------------
  // Schritt 2: State validieren (Requirements 2.1, 2.2, 5.7)
  // -----------------------------------------------------------------------
  if (!state) {
    return NextResponse.redirect(
      new URL("/profile?error=sso-link-invalid-state", process.env.NEXTAUTH_URL)
    );
  }

  // Aktive, nicht abgelaufene Session suchen
  const linkingSession = await prisma.ssoLinkingSession.findFirst({
    where: { state, expiresAt: { gt: new Date() } },
  });

  if (!linkingSession) {
    // Prüfen ob eine abgelaufene/bereits verbrauchte Session existiert hat
    // → State-Replay-Erkennung (Requirement 5.7)
    const expiredOrConsumedSession = await prisma.ssoLinkingSession.findFirst({
      where: { state },
    });

    if (expiredOrConsumedSession) {
      // Abgelaufene Session vorhanden — Replay-Versuch oder TTL überschritten
      await logAudit({
        action: SSO_LINK_STATE_REPLAY,
        actorId: expiredOrConsumedSession.userId,
        details: { provider: "authentik", state },
      });
    }
    // Andernfalls: komplett unbekannter State — keine Session gefunden (inkl. bereits gelöschter)

    return NextResponse.redirect(
      new URL(
        "/profile?error=sso-link-invalid-state",
        process.env.NEXTAUTH_URL
      )
    );
  }

  // -----------------------------------------------------------------------
  // Schritt 3: SSO-Konfiguration laden
  // -----------------------------------------------------------------------
  const ssoConfig = getSsoConfig();
  if (!ssoConfig) {
    // SSO wurde nach dem Initiieren deaktiviert — Fehler-Redirect
    await deleteLinkingSessionById(linkingSession.id);
    await logAudit({
      action: SSO_LINK_FAILED,
      actorId: linkingSession.userId,
      details: { provider: "authentik", reason: "SSO nicht konfiguriert" },
    });
    return NextResponse.redirect(
      new URL("/profile?error=sso-link-failed", process.env.NEXTAUTH_URL)
    );
  }

  // -----------------------------------------------------------------------
  // Schritt 4: Token-Exchange (10s Timeout) (Requirements 2.4, 2.9, 5.5)
  // -----------------------------------------------------------------------
  if (!code) {
    await deleteLinkingSessionById(linkingSession.id);
    await logAudit({
      action: SSO_LINK_FAILED,
      actorId: linkingSession.userId,
      details: { provider: "authentik", reason: "Kein Authorization-Code" },
    });
    return NextResponse.redirect(
      new URL("/profile?error=sso-link-failed", process.env.NEXTAUTH_URL)
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/sso/link/callback`;

  const tokenResult = await exchangeCodeForToken({
    code,
    codeVerifier: linkingSession.codeVerifier, // aus der serverseitigen Session (Requirement 5.5)
    clientId: ssoConfig.clientId,
    clientSecret: ssoConfig.clientSecret,
    issuerUrl: ssoConfig.issuerUrl,
    redirectUri,
  });

  if ("error" in tokenResult) {
    await deleteLinkingSessionById(linkingSession.id);
    await logAudit({
      action: SSO_LINK_FAILED,
      actorId: linkingSession.userId,
      details: {
        provider: "authentik",
        reason: "Token-Exchange fehlgeschlagen",
        error: tokenResult.error,
      },
    });
    return NextResponse.redirect(
      new URL("/profile?error=sso-link-failed", process.env.NEXTAUTH_URL)
    );
  }

  // -----------------------------------------------------------------------
  // Schritt 5: ID-Token verifizieren, sub extrahieren (Requirements 2.5, 5.6)
  // -----------------------------------------------------------------------
  const claims = await verifyIdToken(tokenResult.idToken, ssoConfig.issuerUrl);

  if (!claims || !claims.sub) {
    await deleteLinkingSessionById(linkingSession.id);
    await logAudit({
      action: SSO_LINK_FAILED,
      actorId: linkingSession.userId,
      details: {
        provider: "authentik",
        reason: claims
          ? "sub-Claim fehlt oder leer"
          : "ID-Token-Verifikation fehlgeschlagen",
      },
    });
    return NextResponse.redirect(
      new URL("/profile?error=sso-link-failed", process.env.NEXTAUTH_URL)
    );
  }

  const sub = claims.sub;

  // -----------------------------------------------------------------------
  // Schritt 6: Conflict-Check (Requirement 2.8, Property 7)
  // sub bereits einem anderen User zugeordnet → Hijacking verhindern
  // -----------------------------------------------------------------------
  const existingAccount = await prisma.ssoAccount.findUnique({
    where: {
      provider_providerAccountId: { provider: "authentik", providerAccountId: sub },
    },
  });

  if (existingAccount && existingAccount.userId !== linkingSession.userId) {
    await deleteLinkingSessionById(linkingSession.id);
    await logAudit({
      action: SSO_LINK_CONFLICT,
      actorId: linkingSession.userId,
      details: {
        provider: "authentik",
        sub,
        conflictingUserId: existingAccount.userId,
      },
    });
    return NextResponse.redirect(
      new URL("/profile?error=sso-already-linked", process.env.NEXTAUTH_URL)
    );
  }

  // -----------------------------------------------------------------------
  // Schritt 7: SsoAccount upserten (Requirements 2.6, 5.1)
  // userId AUSSCHLIESSLICH aus linkingSession — niemals aus ID-Token!
  // -----------------------------------------------------------------------
  await prisma.ssoAccount.upsert({
    where: {
      provider_providerAccountId: { provider: "authentik", providerAccountId: sub },
    },
    create: {
      userId: linkingSession.userId, // aus der serverseitigen Session (Requirement 5.1)
      provider: "authentik",
      providerAccountId: sub,
    },
    update: {
      userId: linkingSession.userId, // aus der serverseitigen Session (Requirement 5.1)
    },
  });

  // -----------------------------------------------------------------------
  // Schritt 8: Session löschen (Requirement 2.7, 5.3)
  // Einmal-Verwendung: Session nach erfolgreichem Callback entfernen
  // -----------------------------------------------------------------------
  await deleteLinkingSessionById(linkingSession.id);

  // -----------------------------------------------------------------------
  // Schritt 9: Audit-Log und Redirect (Requirements 2.10, 5.6)
  // -----------------------------------------------------------------------
  await logAudit({
    action: SSO_LINK_SUCCESS,
    actorId: linkingSession.userId,
    details: { provider: "authentik", sub },
  });

  return NextResponse.redirect(
    new URL("/profile?success=sso-linked", process.env.NEXTAUTH_URL)
  );
}
