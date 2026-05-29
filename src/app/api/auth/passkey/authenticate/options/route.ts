import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@/lib/services/passkey-service";
import { checkPasskeyAuthRateLimit } from "@/lib/services/passkey-auth-rate-limiter";
import { getClientIp } from "@/lib/utils/request-ip";

/**
 * POST /api/auth/passkey/authenticate/options
 *
 * Public endpoint — no authentication required.
 * Generates WebAuthn authentication options (challenge) for discoverable credentials.
 *
 * Requirements: 3.2, 3.10
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP (check before generating options)
    const ip = getClientIp(request);
    const rateCheck = checkPasskeyAuthRateLimit(ip);
    if (!rateCheck.allowed) {
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

    const options = await generateAuthenticationOptions();
    return NextResponse.json({ options });
  } catch (error) {
    console.error("POST /api/auth/passkey/authenticate/options error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
