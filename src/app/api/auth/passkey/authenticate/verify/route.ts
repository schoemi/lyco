import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { verifyAuthentication } from "@/lib/services/passkey-service";
import {
  checkPasskeyAuthRateLimit,
  recordFailedPasskeyAuth,
} from "@/lib/services/passkey-auth-rate-limiter";
import { getClientIp } from "@/lib/utils/request-ip";
import { logAudit, PASSKEY_AUTH_SUCCESS, PASSKEY_AUTH_FAILED } from "@/lib/services/log-service";
import { getSessionCookieName } from "@/lib/utils/session-cookie";
import { SESSION_MAX_AGE_DEFAULT } from "@/lib/auth.config";

/**
 * POST /api/auth/passkey/authenticate/verify
 *
 * Public endpoint — no authentication required.
 * Verifies a WebAuthn authentication assertion, creates a JWT session (24h default),
 * applies rate limiting, and logs all attempts to the audit log.
 *
 * Requirements: 3.3, 3.7, 3.9, 6.3, 6.4
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    // Rate limiting by IP — check before processing
    const rateCheck = checkPasskeyAuthRateLimit(ip);
    if (!rateCheck.allowed) {
      // Log rate-limited attempt
      logAudit({
        action: PASSKEY_AUTH_FAILED,
        details: { reason: "rate_limited", method: "passkey" },
        ipAddress: ip,
      });

      return NextResponse.json(
        {
          error: `Zu viele fehlgeschlagene Versuche. Bitte warten Sie ${Math.ceil((rateCheck.retryAfter ?? 900) / 60)} Minuten.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfter ?? 900) },
        }
      );
    }

    const body = await request.json();
    const { assertion } = body;

    if (!assertion) {
      return NextResponse.json(
        { error: "Assertion fehlt" },
        { status: 400 }
      );
    }

    // Verify the authentication assertion
    const authenticatedUser = await verifyAuthentication(assertion);

    // Check account status — deny suspended/pending accounts
    if (authenticatedUser.accountStatus === "SUSPENDED") {
      logAudit({
        action: PASSKEY_AUTH_FAILED,
        actorId: authenticatedUser.id,
        details: {
          reason: "account_suspended",
          method: "passkey",
          credentialId: authenticatedUser.credentialId,
        },
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: "Ihr Konto wurde gesperrt. Bitte wenden Sie sich an den Administrator." },
        { status: 401 }
      );
    }

    if (authenticatedUser.accountStatus === "PENDING") {
      logAudit({
        action: PASSKEY_AUTH_FAILED,
        actorId: authenticatedUser.id,
        details: {
          reason: "account_pending",
          method: "passkey",
          credentialId: authenticatedUser.credentialId,
        },
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: "Ihr Konto wartet auf Freigabe durch einen Administrator." },
        { status: 401 }
      );
    }

    // Create JWT session token (24h default duration)
    const now = Math.floor(Date.now() / 1000);
    const token = await encode({
      token: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
        accountStatus: authenticatedUser.accountStatus,
        authMethod: "passkey",
        rememberMe: false,
        iat: now,
        exp: now + SESSION_MAX_AGE_DEFAULT,
      },
      secret: process.env.AUTH_SECRET!,
      salt: getSessionCookieName(),
    });

    // Log successful authentication
    logAudit({
      action: PASSKEY_AUTH_SUCCESS,
      actorId: authenticatedUser.id,
      targetEntity: "User",
      targetId: authenticatedUser.id,
      details: {
        method: "passkey",
        credentialId: authenticatedUser.credentialId,
      },
      ipAddress: ip,
    });

    // Set session cookie
    const cookieName = getSessionCookieName();
    const isSecure =
      process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
      },
    });

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_DEFAULT,
      path: "/",
    });

    return response;
  } catch (error) {
    // Record failed attempt for rate limiting
    recordFailedPasskeyAuth(ip);

    // Log failed authentication attempt
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logAudit({
      action: PASSKEY_AUTH_FAILED,
      details: {
        method: "passkey",
        reason: errorMessage,
      },
      ipAddress: ip,
    });

    if (error instanceof Error) {
      // Known business errors from passkey-service
      const clientErrors = [
        "Passkey-Authentifizierung fehlgeschlagen",
        "Sicherheitsproblem erkannt",
        "Sicherheitsabfrage ist abgelaufen",
      ];
      if (clientErrors.some((msg) => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
    }

    console.error("POST /api/auth/passkey/authenticate/verify error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
