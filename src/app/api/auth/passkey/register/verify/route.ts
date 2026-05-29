import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyRegistration } from "@/lib/services/passkey-service";
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

    const body = await request.json();
    const { credential, name } = body;

    if (!credential) {
      return NextResponse.json(
        { error: "Credential fehlt" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Der Passkey-Name muss zwischen 1 und 64 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const passkey = await verifyRegistration(session.user.id, credential, name);
    return NextResponse.json({ passkey }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      // Known business errors from passkey-service
      const clientErrors = [
        "Passkey-Name muss zwischen",
        "Maximale Anzahl",
        "Sicherheitsabfrage ist abgelaufen",
        "Passkey-Registrierung fehlgeschlagen",
        "Nicht unterstützter Algorithmus",
      ];
      if (clientErrors.some((msg) => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("POST /api/auth/passkey/register/verify error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
