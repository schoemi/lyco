import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/services/password-reset-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Token, Passwort und Passwort-Bestätigung sind erforderlich." },
        { status: 400 }
      );
    }

    await resetPassword(token, password, confirmPassword);

    return NextResponse.json(
      {
        message:
          "Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.",
      },
      { status: 200 }
    );
  } catch (error) {
    // Rate limit errors → 429
    if (
      error instanceof Error &&
      (error.message.startsWith("Zu viele Versuche") ||
        error.message.startsWith("Zu viele Anfragen"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // Token/validation errors from the service → 400
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Everything else → 500
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
