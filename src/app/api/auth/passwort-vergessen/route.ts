import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/services/auth-service";
import { requestPasswordReset } from "@/lib/services/password-reset-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email format
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse" },
        { status: 400 }
      );
    }

    await requestPasswordReset(email);

    // Always return the same success message (prevents email enumeration)
    return NextResponse.json(
      {
        message:
          "Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Rücksetzungslink gesendet. Bitte prüfe dein Postfach.",
      },
      { status: 200 }
    );
  } catch (error) {
    // Rate limit errors → 429
    if (
      error instanceof Error &&
      error.message.startsWith("Zu viele Anfragen")
    ) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // Everything else → 500
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
