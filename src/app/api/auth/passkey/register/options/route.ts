import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateRegistrationOptions } from "@/lib/services/passkey-service";
import { checkPasskeyRegistrationRateLimit } from "@/lib/services/passkey-rate-limiter";
import { getClientIp } from "@/lib/utils/request-ip";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Rate limiting by IP
    const ip = getClientIp(request);
    const rateCheck = checkPasskeyRegistrationRateLimit(ip);
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

    const options = await generateRegistrationOptions(session.user.id);
    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof Error) {
      // Known business errors from passkey-service
      if (error.message.includes("Maximale Anzahl")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("Benutzer nicht gefunden")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("POST /api/auth/passkey/register/options error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
